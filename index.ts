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
    socket.emit("get_pinpoint_id", (response: string) => {
        let responseJson = JSON.parse(response);
        pinpointId = responseJson["pinpoint_id"];
        isRequester = responseJson["is_requester"];
        console.log(`Socket: ${socket.id} is a ${isRequester ? "Requester" : "Responder"} in pinpoint link ${pinpointId}`);

        // Map socket ID to pinpoint ID.
        socketToPinpointId[socket.id] = pinpointId;
        
        // Add connection if new.
        if (!(pinpointId in connections)) {
            connections[pinpointId] = {requesterSid: "", responderSid: ""};
        }
        
        // Set the socket ID to the role type.
        if (isRequester) {
            connections[pinpointId].requesterSid = socket.id;
        } else {
            connections[pinpointId].responderSid = socket.id;
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
        // Skip if is get pinpoint ID.
        if (event === "get_pinpoint_id" || event === "connect") {
            return;
        }
        
        // Error out if Socket ID not found.
        if (!(socket.id in socketToPinpointId)) {
            console.error("Socket ID not found in mapping."+socket.id);
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
    });
});