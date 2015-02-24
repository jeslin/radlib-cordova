//update table entries when an ID tag has been seen
function updateTable(object) {
	var db_object = {};
	db_object.id = object.id;
	//db_object.reader = object.reader;
	db_object.friendlyName = object.friendlyName;

	if(object.report == "seen"){
		db_object.firstSeen = object.time;
		db_updateCount(db_object);
	}else if(object.report == "lost"){
		//do nothing for now
	}
}

function db_initAndLoad() {
	db_init();
	db_print();
}

// Creates a database of 5 MB called TAGS with fields [id, module, time_read, count]
function db_init() {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize, null);

	db.transaction(function (tx) {
		  tx.executeSql('CREATE TABLE IF NOT EXISTS TAGS(id, friendly_name, time_read, count)');
	});
}

function db_readerInit() {
   var dbSize = 5 * 1024 * 1024;
   var db = openDatabase("testDatabase", "1.0", "Reader DB", dbSize, null);

   db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS READERS(connectionType, model, address, friendlyName)');
   });
}

function db_deleteRows() {
   
}

// Checks to see if object is already in database and updates count or adds entry to database, accordingly
function db_updateCount(object) {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);

	db.transaction(function (tx) {
	    tx.executeSql("SELECT * FROM TAGS WHERE id= '" + object.id + "'", [], function (tx, results) {
	    	// if no results are found
	    	if (results.rows.length == 0) {
	    		db_addEntry(object);
	    	}
	    	else {
	    		db_incrementCount(object);
	    	}
	    	db_print();
 		}, null);
	});
}

// Increments count for an object that exists in the database
function db_incrementCount(object) {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);

	db.transaction(function (tx) {
		  tx.executeSql("UPDATE TAGS SET count = count + 1 WHERE id = '" + object.id + "'");
	});
}

// Adds a new entry for an object that does not yet exist in the database
function db_addEntry(object) {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);

	db.transaction(function (tx) {
		tx.executeSql("INSERT INTO TAGS (id, friendly_name, time_read, count) VALUES(?,?,?,?)", [object.id, object.friendlyName, object.firstSeen, 1], null, null);
	});

}

//deletes specified tag from the table
function db_deleteEntry(object) {
   var dbSize = 5 * 1024 * 1024;
   var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);
   
	db.transaction(function (tx) {
		tx.executeSql("DELETE FROM TAGS WHERE id = '" + object.id + "'");
	});   

}

// Updates HTML table containing database entries
function db_print() {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);
	var htmlTable;

	db.transaction(function (tx) {
	    tx.executeSql('SELECT * FROM TAGS', [], function (tx, results) {
		    var len = results.rows.length, i;
		    for (i = 0; i < len; i++){
		    	htmlTable += "<tr><td>" + results.rows.item(i).id;
            htmlTable += "</td><td>" + results.rows.item(i).module;
            htmlTable += "</td><td>" + results.rows.item(i).time_read;
            htmlTable += "</td><td>" + results.rows.item(i).count + "</td><td class='del' style='text-align:center; display:none;'><button class='del topcoat-button--quiet' style='display:none;'>x</button></td></tr>";
		    }

		    //htmlTable += "</table>";
          $("#tagsTable tbody").html(htmlTable);
 		}, null);
	});
}

// Clears contents of table
function db_clear() {
	var dbSize = 5 * 1024 * 1024;
	var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);

	var result = confirm("Are you sure you want to clear the database?");
	
	if (result == true) {
		db.transaction(function (tx) {
  			tx.executeSql('DROP TABLE TAGS');
		});

		document.querySelector('#tagsDB').innerHTML = "<table id='tagsTable'><tr><th>ID Tag</th><th>RFID Reader</th><th>Time Read</th><th>Count</th></tr></table>";
		alert("Database cleared!");
		db_init();
	}

}

//allow cordova.file to be used
document.addEventListener("deviceready", null, false);

// Exports database content to CSV
// For Android, this is located in "My Files/Downloads" directory.
function db_export() {
   //cordova.file.externalRootDirectory accesses the root directory
   //Download specifies the Download directory within the root directory
   //gotDirectory runs on success, dumpLog runs on error
   window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory + "Download", gotDirectory, dumpLog);

}

function gotDirectory(dir) {
   //creates a .csv file within the directory. It creates the file if none exists
   //gotFile runs on success, dumpLog runs on error
   dir.getFile("radlib.csv", {create:true}, gotFile, dumpLog);                    
}

function gotFile(file){
   //initiates a writer object to write to the file
   //writeToFile runs on success, dumpLog runs on error;
   file.createWriter(writeToFile, dumpLog); 
};

function writeToFile(writer){
   //accesses the database
   var dbSize = 5 * 1024 * 1024;
   var db = openDatabase("tagDatabase", "1.0", "Tag DB", dbSize);
   
   //adds alerts to tell the user when the exporting is completed or failed
   writer.onwriteend = function(e) {
      alert("CSV Writing complete");
   };

   writer.onerror = function(e) {
      alert('Write failed: ' + e.toString());
   };
   
   //creates a query to select all items from the table
   db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM TAGS', [], function (tx, results) {
         var csvTextString = "", len = results.rows.length, i, blob;
         
         //prepare a string with the table headers
         csvTextString += "ID Tag" + "," + "RFID Reader" + "," + "Time Read" + "," + "Count" + "\n";
         
         //appends the table values to the string
         for (i = 0; i < len; i++){
            csvTextString += results.rows.item(i).id + "," + results.rows.item(i).friendly_name + "," + results.rows.item(i).time_read + "," + results.rows.item(i).count + "\n";
         }
         
         //write the string to file
         blob = new Blob([csvTextString], {type: 'text/plain'});
         writer.write(blob);	 
      }, null);
   });
};
