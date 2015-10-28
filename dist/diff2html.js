
	    /* Diff */
	    var oldMode = /^old mode (\d{6})/;
	    var newMode = /^new mode (\d{6})/;
	    var deletedFileMode = /^deleted file mode (\d{6})/;
	    var newFileMode = /^new file mode (\d{6})/;

	    var copyFrom = /^copy from (.+)/;
	    var copyTo = /^copy to (.+)/;

	    var renameFrom = /^rename from (.+)/;
	    var renameTo = /^rename to (.+)/;

	    var similarityIndex = /^similarity index (\d+)%/;
	    var dissimilarityIndex = /^dissimilarity index (\d+)%/;
	    var index = /^index ([0-9a-z]+)..([0-9a-z]+) (\d{6})?/;

	    /* Combined Diff */
	    var combinedIndex = /^index ([0-9a-z]+),([0-9a-z]+)..([0-9a-z]+)/;
	    var combinedMode = /^mode (\d{6}),(\d{6})..(\d{6})/;
	    var combinedNewFile = /^new file mode (\d{6})/;
	    var combinedDeletedFile = /^deleted file mode (\d{6}),(\d{6})/;

	            '     <table class="d2h-file-list">\n' +
	                return '     <tr class="d2h-file-list-line">\n' +
	                    '       <td class="d2h-lines-added">\n' +
	                    '         <span>+' + file.addedLines + '</span>\n' +
	                    '       </td>\n' +
	                    '       <td class="d2h-lines-deleted">\n' +
	                    '         <span>-' + file.deletedLines + '</span>\n' +
	                    '       </td>\n' +
	                    '       <td class="d2h-file-name"><a href="#' + printerUtils.getHtmlId(file) + '">&nbsp;' + printerUtils.getDiffName(file) + '</a></td>\n' +
	                    '     </tr>\n'
	            '</table></div>\n';