/*
*
*
*/
    window.checkSurroundingTiles = function(tilePref, tileHistory, row, col) {
        let tileAbove    = tileHistory[(tileHistory.length - totCols) - 1];
        let previousTile = tileHistory[tileHistory.length - 1];
        let goldenThread = JSON.parse(localStorage.getItem('goldenThread') || '{}');

        //EVERYTHING EXCEPT THE TOP ROW
        if (row > 0) {
            //exclusion of bigroom may be overridden later in the buildBigRoom function
            tilePref.exclude = "start,bigroom,overlay,";
            //CHECK TILE ABOVE
            if (tileAbove["south"]) {
                tilePref.include += "north,";
            } else {
                tilePref.exclude += "north,";
            }
        } else {
            tilePref.exclude = "north,filler,bigroom,deadend,overlay,";
        }

        //CHECK AGAINST PREVIOUS TILE...
        if (tileHistory.length > 0) {
            //EXIT east -- CONNECT west
            if (previousTile['east']) {
                tilePref.include += "west,";
                //NO east, SO EXCLUDE west
            } else {
                tilePref.exclude += "west,";
            }
        }
//SPECIFIC COLUMN-LOCATION-BASED EXCLUSIONS
        //western border - no exit west
        if (col == 0) {
            tilePref.exclude += "west,";
        } //else tilePref.include += ",";
        //eastern border - no exit east
        if (col == totCols) {
            tilePref.exclude += "east,";
        }
        //southern border - no exit south
        if (row == totRows) {
            tilePref.exclude += "south,";
        }
        //TODO: ensure we have a golden thread from start location, right through the maze. Currently only traces a straight line down
        if ((tileAbove && tileAbove["others"] == "start") ||
            goldenThread[(row)+'_'+col-1] ||
            goldenThread[(row-1)+'_'+col]) {
            goldenThread[row+'_'+col] = true;
            localStorage.setItem('goldenThread', JSON.stringify(goldenThread));
        }

        return tilePref;
    }

    /*
    *
    *
    */
    window.refineShortlist = function(tileList, searchItem, returnType, row, col) {
        var tempTileExclude = [];
        var tempTileInclude = [];
        if (returnType == "include") {
            var tempTileArray = new Object();
        } else {
            tempTileArray = $.extend(true, {}, tileList);
        }
        $.each(tileList, function (key, tileAttr) {
            if ((tileAttr[searchItem] !== undefined && tileAttr[searchItem] === true) || tileAttr['others'].indexOf(searchItem) > -1) {
                if (returnType == "include") {
                    tempTileArray[key] = tileList[key];
                } else {
                    delete tempTileArray[key];
                }
            } else {
                if (searchItem === "west" &&
                    !tileAttr[searchItem] &&
                    tileAttr["east"] &&
                    returnType == "include" &&
                    tileAttr['others'].indexOf("bigroom") < 0) {
                    tileList[key].west = true;
                    tileList[key].east = false;
                    tileList[key].flipHor = true;
                    tempTileArray[key] = tileList[key];
                }
                if (searchItem === "north" &&
                    !tileAttr[searchItem] &&
                    tileAttr["south"] &&
                    returnType == "include" &&
                    tileAttr['others'].indexOf("bigroom") < 0) {
                    tileList[key].north = true;
                    tileList[key].south = false;
                    tileList[key].flipVert = true;
                    tempTileArray[key] = tileList[key];
                }
            }
        });
        return tempTileArray;
    }

    /*
    *
    *
    */
    window.getSelectedTiles = function(tilePref, row, col) {
        var tileList = $.extend(true, {}, tileSource);
        includeThis = cleanArray(tilePref.include.substring(0, tilePref.include.length - 1).split(","));
        excludeThis = cleanArray(tilePref.exclude.substring(0, tilePref.exclude.length - 1).split(","));

        $(includeThis).each(function (searchIndex) {
//exclude everything that IS NOT in this array
            tileList = refineShortlist(tileList, includeThis[searchIndex], "include", row, col);
        });

        $(excludeThis).each(function (searchIndex) {
//exclude everything that IS in this array
            tileList = refineShortlist(tileList, excludeThis[searchIndex], "exclude", row, col);
        });
        return tileList;
    }

    /*
    *
    *
    */
    window.shuffleTiles = function(arr, row, col) {
        var keys = Object.keys(arr);
        if (keys.length === 0) {
            //console.log("ADD FILLER");
            arr = ["filler"];
        } else {
            arr = arr[keys[Math.floor(keys.length * Math.random())]];
        }

        return arr;
    }

    /*
    *
    */
    window.applyFlip = function(image, tilePref, row, col) {
//IF WE HAVE AN EXPLICIT INSTRUCTION TO FLIP THE TILE - THIS WILL BE USED LATER TO REDUCE THE ISSUE WHERE A SINGLE TILE IS COPIED MULTIPLE TIMES TO CHANGE EXIT DIRECTIONS
        var style = "";
        if (image.flipHor) {
            //console.log("FLIPPING HOR: "+row+","+col);
            style += " flip-hor";
        }
        if (image.flipVert) {
            //console.log("FLIPPING VERT: "+row+","+col);
            style += " flip-vert";
//IF WE HAVE PASSAGES WITH EITHER A NORTH/SOUTH OR EAST/WEST ENTRANCE
        }
        if (((image.north == image.south) &&
            (image.east == image.west) &&
            Math.random() > 0.5) ||
            style == " flip-hor flip-vert") {
            style = " flip-hor-vert";
//IF WE HAVE PASSAGES WITH ETHER A SINGLE EAST OR WEST ENTRANCE
        } else if (((image.east &&
            !image.north &&
            !image.south &&
            !image.west) ||
            (image.west &&
                !image.north &&
                !image.south &&
                !image.east)) &&
            !image.flipHor &&
            Math.random() > 0.5) {
            style += " flip-vert";
//IF WE HAVE PASSAGES WITH ETHER A SINGLE NORTH OR SOUTH ENTRANCE
        } else if (((image.north &&
            !image.east &&
            !image.south &&
            !image.west) ||
            (image.south &&
                !image.north &&
                !image.west &&
                !image.east)) &&
            Math.random() > 0.5) {
            style += " flip-hor";
        }
        return style;
    }

    /*
    *
    * THIS OVERLAY FUNCTION NEEDS A CLEANUP
    *
    */
    window.applyOverlay = function(image, imagePath, row, col) {
        if (image.others.indexOf("empty") > -1 && Math.random() > 0.1) {
            var overlayKeys = _.without(Object.keys(overlayTiles), "overlay,passage", "overlay,corner,statue");
            if (image.west === true && image.east === true && image.south === false && image.north === false) {
                var randomKey = "overlay,passage";
            } else if (image.north === false && image.east === false && image.south === true && image.west === false) {
                //console.log("inserting overlay: "+row+","+col);
                var randomKey = "overlay,corner,statue";
            } else {
                var randomKey = overlayKeys[Math.floor(Math.random() * overlayKeys.length)];
            }
            var tileStyle = overlayTiles[randomKey].style;
            var overlayImage = $("<img />").attr({
                "src": imagePath + randomKey + ".png",
                "class": "overlay " + overlayTiles[randomKey].class
            });
            //START TILE - INCLUDE HERO AS OVERLAY
        } else if (image.others.indexOf("start") > -1) {
            var overlayImage = $("<img />").attr({
                "src": imagePath + "hero.png",
                "class": "overlay hero",
                "id": "hero"
            });
        } else var overlayImage = "";
        return overlayImage;
    }

    /*
    *
    */
    window.cleanArray = function(thisArray) {
        return $.grep(thisArray, function (n) {
            return n == " " || n
        })
    }

    window.showUnmappedTiles = function(newCol, baseImage, image, tileHeight, tileWidth) {
        if (debugGrid && Object.keys(image.map).length === 0) {
            var debugCol = $("<span class='not_mapped'>");
            $(debugCol).css({height: tileHeight, width: tileWidth});
            newCol.html(baseImage).append(debugCol);
        }
    }
