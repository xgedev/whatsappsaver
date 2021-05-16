const WhatsApp   = require("@adiwajshing/baileys"),
      fs         = require("fs"),
      jsonFormat = require("json-format"),
      download   = require('image-downloader');

let client = new WhatsApp.WAConnection();

exports.run = async () => {

 let authFileExists = fs.existsSync(`${__dirname}/auth_info.json`);

 if (authFileExists)
  client.loadAuthInfo(`${__dirname}/auth_info.json`);

 await client.connect();

 console.log("Logged in as", client.user.name, `(${client.user.jid.replace("@s.whatsapp.net", "")})`);

 fs.writeFileSync(`${__dirname}/auth_info.json`, JSON.stringify(client.base64EncodedAuthInfo()));

 try {
  fs.mkdirSync(`${__dirname}/chats/${client.user.jid.replace("@s.whatsapp.net", "")}`);
 } catch (err) {}

 setTimeout(() => { // wait 5 seconds until contacts & chats are cached
  this.fetchAllChats();
 }, 5000);

}

exports.fetchAllChats = async () => {

 let phoneNumber    = client.user.jid.replace("@s.whatsapp.net", ""),
     allChats       = client?.chats?.array,
     allChatsLength = allChats?.length;

 if (!allChatsLength || allChatsLength === 0) {
  console.log("No chats found, trying again...");
  setTimeout(() => {
   this.fetchAllChats();
  }, 2000);
 }

 process.stdout.write('\033c');
 console.log("Starting fetching chats and messages for", client.user.name, phoneNumber, "...");

 try {
  fs.mkdirSync(`${__dirname}/accounts/${phoneNumber}`);
 } catch (err) {}

 let progressData = {
  fetchedChats: [],
  fetchedMessagesCount: 0
 }

 let totalStartTimestamp = Date.now();

 fs.writeFileSync(`${__dirname}/accounts/${phoneNumber}/contacts.json`, jsonFormat(client.contacts));

 try {
  fs.mkdirSync(`${__dirname}/accounts/${phoneNumber}/profilePictures`);
 } catch (err) {}

 console.log("Fetching profile pictures...");
 let urls = await this.fetchProfilePictures(phoneNumber, allChats);
 console.log("Fetched", urls.length, "profile pictures");

 for (let i = 0; i < allChats.length; i++) { // Loop through all chats

  let startTimestamp = Date.now();

  let chat = {...allChats[i]}; // current chat
  delete chat.messages; // delete messages property (cached messages)

  try {
   fs.mkdirSync(`${__dirname}/accounts/${phoneNumber}/${chat.jid}`);
  } catch (err) { // if error: chat already backupped, continue with next one
   progressData.fetchedChats.push(chat); 
   continue;
  }

  fs.writeFileSync(`${__dirname}/accounts/${phoneNumber}/${chat.jid}/info.json`, jsonFormat(chat));

  let fetchedMessages = [];

  await client.loadAllMessages(chat.jid, (message) => {

   fetchedMessages.push(message); // push message to all fetched messages
   progressData.fetchedMessagesCount++;
   let dateNow = Date.now();
   process.stdout.write('\033c');
   console.log(`
    * ************************************** *
    *
    *  Total progress
    *  - Chats:`, progressData.fetchedChats.length, `/`, allChatsLength, `
    *  - Messages:`, progressData.fetchedMessagesCount, `
    *  - Time:`, (dateNow-totalStartTimestamp)/1000, `seconds,
    * 
    *  Current chat progress
    *  - Chat: ${chat.name} - ${chat.jid}
    *  - Messages:`, fetchedMessages.length, `
    *  - Media:`, 0, `/`, "?", `
    *  - Time:`, (dateNow-startTimestamp)/1000, `seconds
    * 
    * ************************************** *
   `)

  }, 1000, true);

  fs.writeFileSync(`${__dirname}/accounts/${phoneNumber}/${chat.jid}/chat.json`, jsonFormat(fetchedMessages)); // save all fetched messages

  /**
   * Download media files
   */

  try {
   fs.mkdirSync(`${__dirname}/accounts/${phoneNumber}/${chat.jid}/media`);
  } catch (err) {}

  let mediaMessageTypes = [
   "audioMessage",
   "documentMessage",
   "imageMessage",
   "videoMessage"
  ];

  let mediaMessages = fetchedMessages.filter(m => {
   if (!m?.message) return;
   let messageTypes = Object.keys(m.message);
   if (messageTypes.find(t => mediaMessageTypes.includes(t)))
    return true;
  });

  for (let i = 0; i < mediaMessages.length; i++) { // loop through all messages containing downloadable media

   let mediaMessage = mediaMessages[i];

   let dateNow = Date.now();
   process.stdout.write('\033c');
   console.log(`
    * ************************************** *
    *
    *  Total progress
    *  - Chats:`, progressData.fetchedChats.length, `/`, allChatsLength, `
    *  - Messages:`, progressData.fetchedMessagesCount, `
    *  - Time:`, (dateNow-totalStartTimestamp)/1000, `seconds,
    * 
    *  Current chat progress
    *  - Chat: ${chat.name} - ${chat.jid}
    *  - Messages:`, fetchedMessages.length, `
    *  - Media:`, i+1, `/`, mediaMessages.length, `
    *  - Time:`, (dateNow-startTimestamp)/1000, `seconds
    * 
    * ************************************** *
   `)
 
   await client.updateMediaMessage(mediaMessage).catch(() => null); // update media url for download
   let savedAs = await client.downloadAndSaveMediaMessage(mediaMessage, `${__dirname}/accounts/${phoneNumber}/${chat.jid}/media/${mediaMessage.key.id}`, true).catch(() => null); // if theres an error, return null
 
   if (!savedAs) // if savedAs is null (= error) print it. This will happen for files which are older than 3 years because Whatsapp doesn't have them on their servers anymore
    console.log("[", i, "]", "ERROR - Could not download media file");
 
  }

  progressData.fetchedChats.push(chat);

 }

 let dateNow = Date.now();

 process.stdout.write('\033c');
 console.log(`
 * ************************************** *
 *
 *  Total progress - Done
 *  - Chats:`, progressData.fetchedChats.length, `/`, allChatsLength, `
 *  - Messages:`, progressData.fetchedMessagesCount, `
 *  - Time:`, (dateNow-totalStartTimestamp)/1000, `seconds,
 * 
 * ************************************** *
`);

}

exports.fetchProfilePictures = async (phoneNumber, allChats) => {

 let pfpDir = fs.readdirSync(`${__dirname}/accounts/${phoneNumber}/profilePictures`);

 let allChatIds = [...allChats.map(c => c.jid), ...Object.keys(client.contacts)].filter(id => !pfpDir.find(f => f.startsWith(id)));
 
 let urls = [];

 for (let i = 0; i < allChatIds.length; i++) {

  let chatId     = allChatIds[i],
      urlFetched = await client.getProfilePicture(chatId).catch(() => null); // fetch public available url for pfp

  if (!urlFetched) continue; // user has no pfp or pfp is not available to everyone

  urls.push(urlFetched);
 
  await download.image({
   url: urlFetched,
   dest: `${__dirname}/accounts/${phoneNumber}/profilePictures/${chatId}.jpg`
  }).catch((err) => console.log(`Pfp from ${chatId} could not be downloaded`, err));

 }

 return urls;

}