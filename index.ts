import {Server} from "socket.io";

const io = new Server(3000);
console.log("Server started");

io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`A user disconnected: ${socket.id}`);
    });
    
    socket.on("poke", (data) => {
        console.log(data);
    
    })

    socket.onAny((event, args, callback) => {
        console.log(`Event: ${event}, Args: ${args}`);
        socket.emit("test", "Hello World!", (response: string) => {
            console.log(response);
        });
        callback("Received");
    });
});