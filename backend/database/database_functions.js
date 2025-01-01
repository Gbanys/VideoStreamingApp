import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection to the database
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database!');
});

// Example Query: Insert Data
const createRoom = (roomId, password) => {
  connection.query(
  'INSERT INTO chatroom (roomId, password) VALUES (?, ?)',
  [roomId, password],
  (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log('Insert successful:', results);
  }
);
}

const createUser = (userId, username) => {
  connection.query(
  'INSERT INTO chatuser (userId, username) VALUES (?, ?)',
  [userId, username],
  (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log('Insert successful:', results);
  }
);
}

export const createMessage = (userId, text) => {
    connection.query(
      'INSERT INTO chatmessage (userId, text, message_timestamp) VALUES (?, ?, NOW())',
      [userId, text],
      (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          return;
        }
        console.log('Insert successful:', results);
      }
    );
}

const linkUserToChatRoom = (userId, roomId) => {
  connection.query(
  'INSERT INTO chatuser_chatroom (userId, roomId) VALUES (?, ?)',
  [userId, roomId],
  (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log('Insert successful:', results);
  }
);
}

// Example Query: Fetch Data
const getAllChatRooms = () => {
  connection.query('SELECT * FROM chatroom', (err, results) => {
  if (err) {
    console.error('Error executing query:', err);
    return;
  }
  console.log('Chatrooms:', results);
  });
}

export const getAllMessagesFromUsersSorted = (userIds) => {
    return new Promise((resolve, reject) => {
        connection.query(
            'SELECT * FROM chatmessage WHERE userId IN (?) ORDER BY message_timestamp DESC',
            [userIds],
            (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};


export const getAllUsersInSpecificChatRoom = (roomId) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT cu.userId, cu.username FROM chatuser_chatroom ccr JOIN chatuser cu ON ccr.userId = cu.userId WHERE ccr.roomId = ?`,
            [roomId],
            (err, results) => {
                if (err) {
                    console.error('Error executing query:', err);
                    reject(err); // Reject the promise with the error
                } else {
                    console.log('Chatrooms:', results);
                    resolve(results); // Resolve the promise with the results
                }
            }
        );
    });
};