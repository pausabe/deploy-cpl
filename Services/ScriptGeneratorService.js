const AsyncForEach = require("../Utils/AsyncForEach");
const DatabaseService = require("./DatabaseService");

async function GenerateJsonScript(minTablesLogId){
    console.log("generating json scripts");
    let scriptJson = [];
    
    // Get list of changes
    DatabaseService.OpenDatabase();
    let sql = 'SELECT MAX(id) As id, table_name, row_id, action, COUNT(id) AS repeated_records\
                FROM _tables_log\
                WHERE id > ' + minTablesLogId + '\
                GROUP BY table_name, row_id, action\
                ORDER BY id ASC';
    let rows = await DatabaseService.ExecQuery(sql);
    await AsyncForEach.AsyncForEach(rows, async (row) => {
        console.log("script for " + row["table_name"] + " - " + row["row_id"] + "(" + row["action"] + ")");
        let repeated_records = row["repeated_records"];
        if(repeated_records == 1){
        let rowScriptJson = await jsonScriptFromRow(row, true);
        scriptJson.push(rowScriptJson);
        }
        else{
        // If there are 3 repeated records, the 2 firsts must have avoid to add the values to add less innecessary data
        for (let index = 0; index < repeated_records - 1; index++) {
            let fakeRowScriptJson = await jsonScriptFromRow(row, false);
            scriptJson.push(fakeRowScriptJson);
        }
        let rowScriptJson = await jsonScriptFromRow(row, true);
        scriptJson.push(rowScriptJson);
        }
    });
    DatabaseService.CloseDatabase();
    return scriptJson;
}

async function jsonScriptFromRow(row, addValues){
    /*
    input (row)
    {
      id: 4,
      table_name: 'tempsQuaresmaCendra',
      row_id: 1,
      action: 2,
      date: '2021-02-25 08:07:54'
      repeated_records: 1
    }
    output (script json)
    {
      id: 4,
      table_name: 'tempsQuaresmaCendra',
      row_id: 1,
      action: 2, 
      values: {},// <-- NEW (columns-values)
      date: '2021-02-25 08:07:54'
    }
    */
    let rowColumnNames = Object.keys(row);
    let scriptJsonRow = await getScriptJsonRow(rowColumnNames, row, addValues);
    return scriptJsonRow;
}

async function getScriptJsonRow(rowColumnNames, row, addValues){
    let scriptJsonRow = {};
    scriptJsonRow["values"] = {}
    await AsyncForEach.AsyncForEach(rowColumnNames, async (rowColumnName) => {
  
      let rowValue = row[rowColumnName];
  
      // Add the same column & value
      scriptJsonRow[rowColumnName] = rowValue;
  
      // When Inserting (1) or Updating (2) we need to add the values
      if (addValues && rowColumnName == 'action' && (rowValue == 1 || rowValue == 2)){
        let table_name = row["table_name"];
        let row_id = row["row_id"];
        scriptJsonRow["values"] = await getScriptJsonRowValues(table_name, row_id);
      }
    });
    return scriptJsonRow;
}
  
async function getScriptJsonRowValues(table_name, row_id){
    let scriptJsonRowValues = {};
    if(row_id != ""){
        let sql = "SELECT * FROM " + table_name + " WHERE id = " + row_id;
        let queryRowsResult = await DatabaseService.ExecQuery(sql);
        if (queryRowsResult.length == 1) {
            let columns = Object.keys(queryRowsResult[0]);
            let values = Object.values(queryRowsResult[0]);
            for (let index = 0; index < values.length; index++) {
                let column = columns[index];
                let value = values[index];
                if(column != "id"){
                    //if(value.length > 10) value = value.substring(0,10); // just for testing
                    scriptJsonRowValues[column] = value;
                }
            }
        }
    }
    return scriptJsonRowValues;
}

module.exports = { GenerateJsonScript };