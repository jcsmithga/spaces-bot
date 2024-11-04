const tmi = require('tmi.js');
const fs = require('fs');
const path = require('path');
var currentList = fs.readFileSync('currently_selected_list.txt', 'utf-8', (err, data) => {
  if (err) {
      console.error(err);
      return;
  }
});

const goodDiceTxts = []
// Define configuration options
const opts = {
  identity: {
    username: 'NAME_OF_BOT (currently my user name)',
    password: 'oauth:OAUTH_GOES_HERE'
  },
  channels: [
    'NAME_OF_CHANNEL_TO_SEND_MESSAGES TO'
  ]
};



// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

//this ONLY works redeems that take in text, which is one limit to tmi.js's usefulness,
//as well as not talking to twitch api directly, so can't anything on the twitch side with this
client.on('redeem', onRedeemHandler);

// Connect to Twitch:
client.connect();

//fixes the praclists file on startup just in case there's any discrepancies 
updateListOfLists();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  var command = msg.trim();

  //splits command so i can take in multiple parameters for certain commands
  command = command.split(" ")

  // dice command
  if (command[0] === '!dice') {
    const num = rollDice();
    if (num == 100) {
      client.say(target, `:@${context.username}, you rolled a ${num}, PERFECT!!`);
    }
    else if (num >= 75 && num <= 99) {
      client.say(target, `@${context.username}, you rolled a ${num}, pretty good`);
    }
    else if (num >= 50 && num <= 74 && num != 69) {
      client.say(target, `@${context.username}, you rolled a ${num}, sweet`);
    }
    else if (num == 69) {
      client.say(target, `@${context.username}, you rolled a ${num}, NICE LMAO`);
    }
    else if (num >= 25 && num <= 49) {
      client.say(target, `@${context.username}, you rolled a ${num}, could be better, chin up`);
    }
    else if (num >= 0 && num <= 24) {
      client.say(target, `@${context.username}, you rolled a ${num}, sorry this happened`);
    }
    console.log(`* Executed ${command} command\n`);
  }
  
  

  //shows list of commands for any user
  if (command[0] === "?commands"){
    client.say(target, "!dice || ?modcommands")
  }

  //show list of commands for mods
  if (command[0] === "?modcommands"){
    client.say(target, "?praclists | | | !setlist [list index] | | | ?praclist | | | ?pracitem [optional index] | | | -pracitem [item index] | | | +pracitem [item name]")
  }

  //sets a list to edit or review
  if (command[0] === "!setlist"){
    if (context.mod === true || context.username === 'spaces90'){
      if (command.length == 1) {
        console.log("needs indexed value to remove")
      }      
      else {
        const pracList = txtToArray('praclists.txt');
        if (isNaN(command[1])) {
          client.say(target, "Please provide an index, e.g. !setlist 14 ?praclists");
        }
        else {
          currentList = listSelector(pracList[command[1]])
          saveCurrentList('currently_selected_list.txt', pracList[command[1]])
          client.say(target, currentList.slice(0, -4) + " is now current list.")
        }
      }
    }
  }

  //shows list of praclists
  if (command[0] === "?praclists"){
    client.say(target, printFormattedPracList('praclists.txt'))
  }

  //adds a praclist, only I can do this
  if (command[0] === "+praclist" && context.username === "spaces90"){
    if (command.length == 1) {
      client.say(target, "List needs a name.");
    }
    else {
      createTxtFile(command[1]);
      client.say(target, command[1] + " was created.");
    }
  }
  
  //removes a praclist, only I can do this
  if (command[0] === "-praclist" && context.username === "spaces90"){
    if (command.length == 1) {
      client.say(target, "Please provide an index, e.g. -praclist 14");
    }
    else {
      const pracList = txtToArray('praclists.txt');
      if (isNaN(command[1])) {
        client.say(target, "Please provide an index, e.g. -praclist 14");
      }
      else {
        if (deleteTxtFile(pracList[command[1]])) {
          client.say(target, command[1] + " was deleted.");
        }
        else {client.say(target, "No such file was found.");}
      }
    }
    
  }

  //adds an item to list
  if (command[0] == "+pracitem") {
    if(context.mod == true || context.username == "spaces90" ) {
      if (command.length == 1) {
        client.say(target, "Prac item needs a name.");
      }
      else if (currentList != ""){
        var pracitem = ""
        for (var item of command.slice(1)){
          pracitem += item + " "
        }
        //remove last space from line
        client.say(target, "Added entry " + pracitem.slice(0,-1) + " to " + currentList.toString().slice(0, -4));
        addLine(currentList, pracitem.slice(0,-1))
      }
            
      else {console.log("No list selected")}
    }
  }

  //removes an item from list
  if (command[0] == "-pracitem") {
    if(context.mod == true || context.username == "spaces90") {
      if (command.length == 1) {
        console.log("needs indexed value to remove")
      }
      else if (currentList != "") {
        if (removeLine(currentList, Number(command[1]))) {
          client.say(target, "Removed entry " + command[1] + " from " + currentList.slice(0,-4));
        }
        else {client.say(target, "Use an index within range");}
      }
    }
  }
  
  //gets a random or indexed pracitem
  if (command[0] == "?pracitem") {
    if(context.mod == true || context.username == "spaces90" ) {
      if (command.length == 1) {
        if (currentList != "") {
          rand = getRandomInt(0, txtToArray(currentList).length - 1)
          client.say(target, grabPracItem(currentList, rand));
        }
         else (console.log("No praclist selected"));
      }
      else {
        if (grabPracItem(currentList, command[1])){
          client.say(target, grabPracItem(currentList, Number(command[1])))
          }
        else {client.say(target, "Index out of range.")}
      }      
    }
  }

  //prints current list
  if (command[0] == "?praclist") {
    client.say(target, currentList.slice(0,-4) + " || " + printFormattedPracList(currentList))
  }



}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function onRedeemHandler(channel, username, rewardType, tags, message) {
  console.log(tags)
  console.log(rewardType);
  switch(rewardType) {
    // Mantra reward
    case '27c8e486-a386-40cc-9a4b-dbb5cf01e439': break;
  }
}

// Function called when the "dice" command is issued
function rollDice () {
  console.log("executing rollDice...\n")
  const sides = 100;
  return Math.floor(Math.random() * sides) + 1;
}

//creating a praclist
function createTxtFile(filename){
    fs.writeFile(filename + ".txt", "", (err) => {
      if (err) {
        console.error(err);
        return;
      }
      updateListOfLists();
      console.log('File created successfully!');
    });}

//deletes a praclist
function deleteTxtFile(filename){
  fs.unlink(filename + ".txt", function(err) {
    if (err) {
      console.error(err);
      return false;
    }
    updateListOfLists();
    console.log('File deleted successfully!');
    return true;
  });
    return true;}

//adding a line to a praclist
function addLine(txtFile, text){
  console.log("adding line...\n")
  if (fileIsEmpty(txtFile)){
    fs.appendFile(txtFile, text, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('Item added to ' + txtFile + ' successfully!');
    });
  }
  else {
    fs.appendFile(txtFile, "\n" + text, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('Item added to ' + txtFile + ' successfully!');
    });
  }
}

//removes a line from praclist
function removeLine(filePath, lineToRemove) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error(err);
      console.log("No active list, set a list please.")
      return false;
    }
    else if (isNaN(lineToRemove)) {
      console.log("Index out of range");
      return false;
    }
    else if (Number(lineToRemove) > txtToArray(filePath).length - 1) {
      console.log("Index out of range");
      return false;
    }
    else if (Number(lineToRemove) < 0) {
      console.log("Use 0 or greater for an index")
      return false;
    }
    else {
      const lines = data.split('\n');
      lines.splice(lineToRemove, 1);
      const updatedLines = lines.join('\n');
      fs.writeFile(filePath, updatedLines, (err) => {
        if (err) {
          console.error(err);
          return;
        }
  
      console.log('Line removed successfully!');
      return true;
      });
    }
  })
  return true;;
}

//takes in a txtfile and an index and spits out the text there for pracitem retrieval
function grabPracItem(txtFile, index) {
  pracList = txtToArray(txtFile);
  if (isNaN(index)) {
    return false;
  }
  if (index < 0) {
    return false;
  }
  if (index > pracList.length - 1) {
    return false;
  }
  return pracList[index];
}

//check if file is empty for appending purposes (or for whatever you want)
function fileIsEmpty(txtFile){
  const stat = fs.statSync(txtFile)
  if (stat.size > 0){
    return false;
  }
  else {return true;}
}

//returns a list of all txtfiles in a directory
function getTxtFiles(directoryPath) {
  const files = fs.readdirSync(directoryPath);
  const txtFiles = files.filter(file => path.extname(file) === '.txt');
  return txtFiles;
}


//selects a list
function listSelector(file) {
    const fileList = getTxtFiles('C:/Users/spaces/SpacesDocs/spaces_bot')
    var file = file + ".txt"
    if (fileList.includes(file)){
      console.log("File exists: " + file)
      return file;
    }
    else{
      console.log(file + " praclist does not exist");
      return currentList;
    }    
}

//every line of a text file is now an array of those lines
function txtToArray(file){
  var array = fs.readFileSync(file).toString().split("\n");
  return array;
}


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//prints a pretty list to twitch chat
function printFormattedPracList(txtFile) {
  pracList = txtToArray(txtFile);
  printedList = "";
  for (let i = 0; i < pracList.length; i++) {
    pracList[i] = pracList[i].trim();
    printedList += (`[${i}] ${pracList[i]} || `);
  }
  return printedList.slice(0, -3);
}

//looks at .txt in dir, filters them for praclists, and writes a list of praclists to praclists.txt
function updateListOfLists() {
  const fileList = getTxtFiles('C:/Users/spaces/SpacesDocs/spaces_bot')
  fs.writeFileSync('praclists.txt', '', (err) => {
    if (err) {
      console.error('Error clearing file:', err);
    } else {
      console.log('File cleared successfully.');
    }
  });
  newArray = []
  for (const pracList of fileList) {
    if (pracList != 'currently_selected_list.txt' && pracList != 'praclists.txt') {
      newArray.push(pracList.slice(0, -4));
    }
  }
  addLine('praclists.txt', newArray.join("\n"));
}


//sets currently selected list to currently.selected_list.txt so we don't have to manually set it every time the bot is live
function saveCurrentList(filePath, newLine) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    const lines = data.split('\n');
    lines[0] = newLine + '.txt'; 
    const updatedContent = lines.join('\n');

    fs.writeFile(filePath, updatedContent, 'utf-8', (err) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log('First line updated successfully!');
    });
  });
}