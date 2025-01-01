export class User {
    _id
    _username
    _color
    _messages
    constructor(id, username, color, messages) {
        this._id = id;
        this._username = username;
        this._color = color;
        this._messages = messages;
    }
    get id(){
        return this._id;
    }
    get username(){
        return this._username;
    }
    get color(){
        return this._color;
    }
    get messages(){
        return this._messages;
    }
    set id(id){
        this._id = id;
    }
    set username(username){
        this._username = username;
    }
    set color(color){
        this._color = color;
    }
    set messages(messages){
        this._messages = messages;
    }
}

export function getRandomColor() {
    const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const red = randomHex();
    const green = randomHex();
    const blue = randomHex();
    return `#${red}${green}${blue}`;
}