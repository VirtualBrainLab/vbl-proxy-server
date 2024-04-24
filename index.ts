import {Server} from "socket.io";

const io = new Server(3000);
console.log("Server started");

type RequesterResponderPair = {
    requesterSid: string,
    responderSid: string,
}

io.on("connection", (socket) => {
    // Connection and request ID
    console.log(`Service connected: ${socket.id}`);
    socket.emit("get_id", (response: string, isRequester: boolean) => {
        console.log(response + " " + isRequester);
    });


    socket.on("disconnect", () => {
        console.log(`Service disconnected: ${socket.id}`);
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