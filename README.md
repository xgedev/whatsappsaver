# ⚠️ No longer working - Alternative ways
WhatsApp Web has changed over the years and is no longer compatible with the (now deleted) library [@adiwajshing/baileys](https://github.com/adiwajshing/Baileys) this repository used.

Unfortunately I do not have time to update this repository's code to work with [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

However, WhatsApp now provides a built-in way to backup your chats. Go to your WhatsApp settings > Chats > Chat history > Export chat.
<br>
<br>
<br>
<br>
<br>
> Previous README below.
<br>
<br>
<br>
<br>
<br>

# whatsappsaver
Backup all WhatsApp chats, including all kinds of media

I switched to Signal but didn't want to lose my WhatsApp chats and since every software which allows you to create a full backup of your chats isn't free, I coded `whatsappsaver` based on the WhatsApp Web API by [adiwajshing](https://github.com/adiwajshing/Baileys).

It will backup all private and group chats, including audios, videos, documents and images. Note that media files older than 3 years are deleted from the Whatsapp servers and are no longer available.

# How to use
1. `npm install`
2. `npm start`
3. Scan the QR code printed on your terminal screen with WhatsApp Web
4. Depending on how many chats, messages and media messages you have, the backup will take a while (from 1 hour to 48 hours).
If the connection to your phone is lost, just restart it and it will continue backuping the next chat, skipping every chat which already got backuped. You may want to delete the last folder (chat) which got backuped located in `./systems/accounts`.

# How to view a backup
Use [`whatsappviewer`](https://github.com/derxge/whatsappviewer).

# How to create backups for multiple phone numbers
Once you scanned the QR code, the file `./systems/auth_info.json` gets created to log you back in without printing a new QR code.
Simply delete the `auth_info.json` file, restart and scan the new QR code.
Since all backups are saved in the `./systems/accounts` directory you can savely create multiple backups without overwriting the other ones.
