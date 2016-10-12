<?php
 $fileContent = file_get_contents("javascript/tileDefs.js");
 $tileDefsFile = stripcslashes((strstr($fileContent,"[")));
 $tileDefsFile = explode("\",", $tileDefsFile);
 $tileArray = [];
foreach ($tileDefsFile as $key => $tileName) {
	$tileName = str_replace("\"", "", $tileName);
	$tileName = str_replace("[", "", $tileName);
	$tileName = str_replace("]", "", $tileName);
	$tileName = trim($tileName);
	
	$tilePropsArray = ["fileName" => $tileName, "north" => false, "east" => false, "south" => false, "west" => false, "others" => false];
	array_push($tileArray, $tileName);
	$thisTile = explode(",", $tileName);	
	$counter = 0;
	foreach ($thisTile as $tileDef) {
		
		switch ($tileDef) {
			case "bottom":
				$tilePropsArray["south"] = true;
			break;
			case "right":
				$tilePropsArray["east"] = true;
			break;
			case "top":
				$tilePropsArray["north"] = true;
			break;
			case "left":
				$tilePropsArray["west"] = true;
			break;
			default: {
				$tileName = str_replace("top", "", $tileName);
				$tileName = str_replace("bottom", "", $tileName);
				$tileName = str_replace("left", "", $tileName);
				$tileName = str_replace("right", "", $tileName);
				$tileName = trim($tileName, ",");	
				$tilePropsArray["others"] = $tileName;			
				if (strstr($tileName, ",")) {
					break;
				}
			}			
			
		}
		
	}
	array_push($tileArray, $tilePropsArray);		
	
}
$json = json_encode($tileArray, JSON_PRETTY_PRINT);
$json = str_replace('",
    {', '": {', $json);
$json = "tileSource = {
".$json."
}";
$json = str_replace("[", "", $json);
$json = str_replace("]", "", $json);
file_put_contents ("javascript/jsonTileDefs.js", $json);