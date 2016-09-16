//get input parameters from user
$(function() {
/*
*
*
*/	
    function generateDungeon() {
    	console.clear();
		$("#dungeonGrid").html("");
		totRows = $("#dungeonHeight").val();
		totCols = $("#dungeonWidth").val();
		var dungeonGrid = $("#dungeonGrid");
		var newDungeonCol = $("<td>");
		var newDungeonRow = $("<tr>");	
		sessionStorage.setItem("bigRoomInProgress", 0);		
		var row = 0;
		var col = 0;
		var startFlag = true;
		var tileHistory = [];
		var tilePref = {include:"",
					    exclude:""};
		var image = "";
	//generate dungeon layout	
		while(row <= totRows) {	
				var newRow = $(newDungeonRow).clone();
				while(col <= totCols) {		
					var newCol = newDungeonCol.clone();					
					tilePref.exclude = "filler,";
					tilePref.include = ",";
					tilePref = checkSurroundingTiles (tilePref, tileHistory, image, row, col);			
					//DROP THE STARTER IN - ANYWHERE (JUST ONCE!) ON THE FIRST ROW, AFTER THE FIRST COL, AT THE FIRST SPOT WHERE THERE IS NO JOINING CORRIDOR COMING IN FROM THE RIGHT
					if ((image.indexOf("right") == -1) && startFlag && (col > 0 && row == 0)) {		
						tilePref.include += "start,";
						startFlag = false;				
					} else {
						tilePref.exclude += "start,";
						tilePref.include += ",";
					}				
					var tileOptions = getSelectedTiles(tilePref);
					image = shuffleTiles(tileOptions);
					tileHistory.push(image);			

					newCol.html($("<img />").attr({"src":imagePath+image+".png", "class":image, "id": row+","+col}));
					newRow.append(newCol);					
					col++;
				}
				$(dungeonGrid).append(newRow);
				col = 0;
				row++;
		}
	$(dungeonGrid).append(newRow);
	}
 $("#submit").bind("click", function (){generateDungeon()});
});

