import {Server} from "socket.io";

// Create server.
const io = new Server(3000);
console.log("Server started");

// Record connections.
type RequesterResponderPair = {
    requesterSid: string,
    responderSid: string,
}
let connections: { [pinpointId: string]: RequesterResponderPair } = {};
let socketToPinpointId: { [sid: string]: string } = {};

// Connection handler.
io.on("connection", (socket) => {
    console.log(`Service connected: ${socket.id}`);

    // Local properties.
    let pinpointId: string = "";
    let isRequester: boolean = false;

    // Record ID.
    socket.emit("get_pinpoint_id", (pinpointIdInput: string, isRequesterInput: boolean) => {
        console.log("Socket: " + socket.id + " is a " + (isRequesterInput ? "Requester" : "Responder") + " in pinpoint link " + pinpointIdInput);
        pinpointId = pinpointIdInput;
        isRequester = isRequesterInput;

        // Map socket ID to pinpoint ID.
        socketToPinpointId[socket.id] = pinpointIdInput;
        
        // Add connection if new.
        if (!(pinpointIdInput in connections)) {
            connections[pinpointIdInput] = {requesterSid: "", responderSid: ""};
        }
        
        // Set the socket ID to the role type.
        if (isRequesterInput) {
            connections[pinpointIdInput].requesterSid = socket.id;
        } else {
            connections[pinpointIdInput].responderSid = socket.id;
        }
    });

    // Disconnect handler.
    socket.on("disconnect", () => {
        console.log(`Service disconnected: ${socket.id}`);
    });

    socket.on("poke", (data) => {
        console.log(data);

    })

    socket.onAny((event, args, callback) => {
        
        // Error out if Socket ID not found.
        if (!(socket.id in socketToPinpointId)) {
            console.error("Socket ID not found in mapping.");
            return;
        }
        
        let pinpointId = socketToPinpointId[socket.id];
        
        // Error out if pinpoint ID not found.
        if (!(pinpointId in connections)) {
            console.error("Pinpoint ID not found in connections.");
            return;
        }
        
        // If requester, forward to responder.
        if (connections[pinpointId].requesterSid === socket.id) {
            console.log("Forwarding to responder.");
            io.to(connections[pinpointId].responderSid).emit(event, args, callback);
        } else if(connections[pinpointId].responderSid === socket.id) {
            console.error("Responder cannot send messages.");
        }
        
        console.log(`Event: ${event}, Args: ${args}`);
        socket.emit("test", "Hello World!", (response: string) => {
            console.log(response);
        });
        callback("Received");
    });
});