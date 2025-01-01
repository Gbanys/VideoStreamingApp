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
    const randomBrightHex = () =>
        Math.floor(128 + Math.random() * 128) // Restrict range to 128–255 for brighter colors
            .toString(16)
            .padStart(2, '0');

    const red = randomBrightHex();
    const green = randomBrightHex();
    const blue = randomBrightHex();

    return `#${red}${green}${blue}`;
}
