import {users, userId, userIds, messages, socket, roomId} from './stream.js';

export function updateChatWithMessages(){
    const messagesBox = document.querySelector('.messages-box');
    messagesBox.innerHTML = ``;
    for (let message of messages) {
        let userMessage = document.createElement('p');
        console.log(message.color);
        userMessage.innerText = `${message.userId} : ${message.text}`;
        userMessage.style.backgroundColor = message.color;
        messagesBox.prepend(userMessage);
    }
}

export function mapUsersToMessages(data){
    const userMap = new Map(users.map(user => [user.id, user.color]));
    console.log(userMap);
    const changed_messages = data.messages.map(message => ({
        ...message,
        color: userMap.get(message.userId) || null, // Add color or null if not found
    }));
    return changed_messages;
}

function sendMessage(){
    let message_text = document.getElementById('user-input-box').value;
    let allUserIds = userIds;
    allUserIds.push(userId);
    socket.emit('send-chat-message', { userId, roomId, message_text, allUserIds });
    document.getElementById('user-input-box').value = "";
}


function displayOrHideChatMessages() {
    let chat_messages_sidebar = document.querySelector("aside");
    const main_section = document.querySelector("main");
    if (!chat_messages_sidebar) {
        chat_messages_sidebar = document.createElement("aside");
        chat_messages_sidebar.className = "messages-sidebar";
        chat_messages_sidebar.innerHTML = `
            <h3>Chat Messages: </h3>
            <div class="messages-box"></div>
            <div class="input-section">
                <label for="user-input-box"></label>
                <input id="user-input-box" type="text" placeholder="Type your message..." />
                <span id="send-button" class="material-symbols-outlined">send</span>
            </div>
        `;
        main_section.appendChild(chat_messages_sidebar);

        // Add event listener for the send button
        const messageSendButton = document.getElementById('send-button');
        messageSendButton.addEventListener('click', sendMessage);

        updateChatWithMessages();

    } else {
        main_section.removeChild(chat_messages_sidebar);
    }
}


const chatBubble = document.getElementById('chat_bubble');
chatBubble.addEventListener('click', displayOrHideChatMessages);

