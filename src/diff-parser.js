/*
 *
 * Diff Parser (diff-parser.js)
 * Author: rtfpessoa
 *
 */

(function() {

  var utils = require('./utils.js').Utils;

  var LINE_TYPE = {
    INSERTS: 'd2h-ins',
    DELETES: 'd2h-del',
    INSERT_CHANGES: 'd2h-ins d2h-change',
    DELETE_CHANGES: 'd2h-del d2h-change',
    CONTEXT: 'd2h-cntx',
    INFO: 'd2h-info'
  };

  function DiffParser() {
  }

  DiffParser.prototype.LINE_TYPE = LINE_TYPE;

  DiffParser.prototype.generateDiffJson = function(diffInput, configuration) {
    var config = configuration || {};

    var files = [];
    var currentFile = null;
    var currentBlock = null;
    var oldLine = null;
    var oldLine2 = null; // Used for combined diff
    var newLine = null;

    var saveBlock = function() {

      /* Add previous block(if exists) before start a new file */
      if (currentBlock) {
        currentFile.blocks.push(currentBlock);
        currentBlock = null;
      }
    };

    var saveFile = function() {

      /*
       * Add previous file(if exists) before start a new one
       * if it has name (to avoid binary files errors)
       */
      if (currentFile && currentFile.newName) {
        files.push(currentFile);
        currentFile = null;
      }
    };

    var startFile = function() {
      saveBlock();
      saveFile();

      /* Create file structure */
      currentFile = {};
      currentFile.blocks = [];
      currentFile.deletedLines = 0;
      currentFile.addedLines = 0;
    };

    var startBlock = function(line) {
      saveBlock();

      var values;

      /**
       * From Range:
       * -<start line>[,<number of lines>]
       *
       * To Range:
       * +<start line>[,<number of lines>]
       *
       * @@ from-file-range to-file-range @@
       *
       * @@@ from-file-range from-file-range to-file-range @@@
       *
       * number of lines is optional, if omited consider 0
       */

      if (values = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*/.exec(line)) {
        currentFile.isCombined = false;
        oldLine = values[1];
        newLine = values[2];
      } else if (values = /^@@@ -(\d+)(?:,\d+)? -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@@.*/.exec(line)) {
        currentFile.isCombined = true;
        oldLine = values[1];
        oldLine2 = values[2];
        newLine = values[3];
      } else {
        console.error("Failed to parse lines, starting in 0!");
        oldLine = 0;
        newLine = 0;
        currentFile.isCombined = false;
      }

      /* Create block metadata */
      currentBlock = {};
      currentBlock.lines = [];
      currentBlock.oldStartLine = oldLine;
      currentBlock.oldStartLine2 = oldLine2;
      currentBlock.newStartLine = newLine;
      currentBlock.header = line;
    };

    var createLine = function(line) {
      var currentLine = {};
      currentLine.content = line;

      var newLinePrefixes = !currentFile.isCombined ? ['+'] : ['+', ' +'];
      var delLinePrefixes = !currentFile.isCombined ? ['-'] : ['-', ' -'];

      /* Fill the line data */
      if (utils.startsWith(line, newLinePrefixes)) {
        currentFile.addedLines++;

        currentLine.type = LINE_TYPE.INSERTS;
        currentLine.oldNumber = null;
        currentLine.newNumber = newLine++;

        currentBlock.lines.push(currentLine);

      } else if (utils.startsWith(line, delLinePrefixes)) {
        currentFile.deletedLines++;

        currentLine.type = LINE_TYPE.DELETES;
        currentLine.oldNumber = oldLine++;
        currentLine.newNumber = null;

        currentBlock.lines.push(currentLine);

      } else {
        currentLine.type = LINE_TYPE.CONTEXT;
        currentLine.oldNumber = oldLine++;
        currentLine.newNumber = newLine++;

        currentBlock.lines.push(currentLine);
      }
    };

    var diffLines =
      diffInput.replace(/\\ No newline at end of file/g, '')
        .replace(/\r\n?/g, '\n')
        .split('\n');

    /* Diff */
    var oldMode = /^old mode (\d{6})/;
    var newMode = /^new mode (\d{6})/;
    var deletedFileMode = /^deleted file mode (\d{6})/;
    var newFileMode = /^new file mode (\d{6})/;

    var copyFrom = /^copy from "?(.+)"?/;
    var copyTo = /^copy to "?(.+)"?/;

    var renameFrom = /^rename from "?(.+)"?/;
    var renameTo = /^rename to "?(.+)"?/;

    var similarityIndex = /^similarity index (\d+)%/;
    var dissimilarityIndex = /^dissimilarity index (\d+)%/;
    var index = /^index ([0-9a-z]+)\.\.([0-9a-z]+)\s*(\d{6})?/;

    /* Combined Diff */
    var combinedIndex = /^index ([0-9a-z]+),([0-9a-z]+)\.\.([0-9a-z]+)/;
    var combinedMode = /^mode (\d{6}),(\d{6})\.\.(\d{6})/;
    var combinedNewFile = /^new file mode (\d{6})/;
    var combinedDeletedFile = /^deleted file mode (\d{6}),(\d{6})/;

    diffLines.forEach(function(line) {
      // Unmerged paths, and possibly other non-diffable files
      // https://github.com/scottgonzalez/pretty-diff/issues/11
      // Also, remove some useless lines
      if (!line || utils.startsWith(line, '*')) {
        return;
      }

      var values = [];
      if (utils.startsWith(line, 'diff')) {
        startFile();
      } else if (currentFile && !currentFile.oldName && (values = getSrcFilename(line, config))) {
        currentFile.oldName = values;
        currentFile.language = getExtension(currentFile.oldName, currentFile.language);
      } else if (currentFile && !currentFile.newName && (values = getDstFilename(line, config))) {
        currentFile.newName = values;
        currentFile.language = getExtension(currentFile.newName, currentFile.language);
      } else if (currentFile && utils.startsWith(line, '@@')) {
        startBlock(line);
      } else if ((values = oldMode.exec(line))) {
        currentFile.oldMode = values[1];
      } else if ((values = newMode.exec(line))) {
        currentFile.newMode = values[1];
      } else if ((values = deletedFileMode.exec(line))) {
        currentFile.deletedFileMode = values[1];
        currentFile.isDeleted = true;
      } else if ((values = newFileMode.exec(line))) {
        currentFile.newFileMode = values[1];
        currentFile.isNew = true;
      } else if ((values = copyFrom.exec(line))) {
        currentFile.oldName = values[1];
        currentFile.isCopy = true;
      } else if ((values = copyTo.exec(line))) {
        currentFile.newName = values[1];
        currentFile.isCopy = true;
      } else if ((values = renameFrom.exec(line))) {
        currentFile.oldName = values[1];
        currentFile.isRename = true;
      } else if ((values = renameTo.exec(line))) {
        currentFile.newName = values[1];
        currentFile.isRename = true;
      } else if ((values = similarityIndex.exec(line))) {
        currentFile.unchangedPercentage = values[1];
      } else if ((values = dissimilarityIndex.exec(line))) {
        currentFile.changedPercentage = values[1];
      } else if ((values = index.exec(line))) {
        currentFile.checksumBefore = values[1];
        currentFile.checksumAfter = values[2];
        values[3] && (currentFile.mode = values[3]);
      } else if ((values = combinedIndex.exec(line))) {
        currentFile.checksumBefore = [values[2], values[3]];
        currentFile.checksumAfter = values[1];
      } else if ((values = combinedMode.exec(line))) {
        currentFile.oldMode = [values[2], values[3]];
        currentFile.newMode = values[1];
      } else if ((values = combinedNewFile.exec(line))) {
        currentFile.newFileMode = values[1];
        currentFile.isNew = true;
      } else if ((values = combinedDeletedFile.exec(line))) {
        currentFile.deletedFileMode = values[1];
        currentFile.isDeleted = true;
      } else if (currentBlock) {
        createLine(line);
      }
    });

    saveBlock();
    saveFile();

    return files;
  };

  function getExtension(filename, language) {
    var nameSplit = filename.split('.');
    if (nameSplit.length > 1) {
      return nameSplit[nameSplit.length - 1];
    }

    return language;
  }

  function getSrcFilename(line, cfg) {
    var prefixes = ["a/", "i/", "w/", "c/", "o/"];

    if (cfg.srcPrefix) {
      prefixes.push(cfg.srcPrefix);
    }

    return _getFilename('---', line, prefixes);
  }

  function getDstFilename(line, cfg) {
    var prefixes = ["b/", "i/", "w/", "c/", "o/"];

    if (cfg.dstPrefix) {
      prefixes.push(cfg.dstPrefix);
    }

    return _getFilename('\\+\\+\\+', line, prefixes);
  }

  function _getFilename(linePrefix, line, prefixes) {
    var FilenameRegExp = new RegExp('^' + linePrefix + ' "?(.+?)"?$');

    var filename;
    var values = FilenameRegExp.exec(line);
    if (values && values[1]) {
      filename = values[1];
      var matchingPrefixes = prefixes.filter(function(p) {
        return filename.indexOf(p) === 0;
      });

      if (matchingPrefixes[0]) {
        // Remove prefix if exists
        filename = filename.slice(matchingPrefixes[0].length);
      }
    }

    return filename;
  }

  module.exports.DiffParser = new DiffParser();

})();
