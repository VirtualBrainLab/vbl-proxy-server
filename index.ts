import { Server } from "socket.io";

// Create server.
const io = new Server(3000);
console.log("Server started");

// Record connections.
type RequesterResponderPair = {
	requesterSid: string;
	responderSid: string;
};
const connections: { [pinpointId: string]: RequesterResponderPair } = {};
const socketToPinpointId: { [sid: string]: string } = {};

// Connection handler.
io.on("connection", (socket) => {
	console.log(`Service connected: ${socket.id}`);

	// Local properties.
	let pinpointId = "";
	let isRequester = false;

	// Record ID.
	socket.emit("get_pinpoint_id", (response: string) => {
		const responseJson = JSON.parse(response);
		pinpointId = responseJson.pinpoint_id;
		isRequester = responseJson.is_requester;
		console.info(
			`Socket: ${socket.id} is a ${
				isRequester ? "Requester" : "Responder"
			} in pinpoint link ${pinpointId}`,
		);

		// Map socket ID to pinpoint ID.
		socketToPinpointId[socket.id] = pinpointId;

		// Add connection if new.
		if (!(pinpointId in connections)) {
			connections[pinpointId] = { requesterSid: "", responderSid: "" };
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

	// Proxy logic.
	socket.onAny((event, ...args) => {
		console.log(`Handling event: ${event} with args: ${args}`);

		// Error out if Socket ID not found.
		if (!(socket.id in socketToPinpointId)) {
			console.error(`Unregistered connection: Socket ID ${socket.id} not found in mapping.`);
			return;
		}

		const pinpointId = socketToPinpointId[socket.id];

		// Error out if pinpoint ID not found.
		if (!(pinpointId in connections)) {
			console.error("Unregistered connection: Pinpoint ID not found in connections.");
			return;
		}
		
		// Extract callback.
		const callback =
			typeof args[args.length - 1] === "function" ? args.pop() : undefined;
		
		// Extract requester and responder.
		const { requesterSid, responderSid } = connections[pinpointId];
		
		// Error out if the connection is not complete.
		if (requesterSid === "") {
			console.error("Connection incomplete. Missing requester.");
			if(callback) callback();
		} else if (responderSid === "") {
			console.error("Connection incomplete. Missing responder.");
			if(callback) callback();
			return;
		}

		// Prepend socket id to args.
		args.unshift(socket.id);

		// If requester, forward to responder.
		if (requesterSid === socket.id) {
			console.info("Forwarding to responder.");
			io.to(responderSid)
				.timeout(1000)
				.emit(event, ...args, (err: object, response: object) => {
					if (err) {
						console.error(`Received error: ${err}`);
					} else {
						console.info(`Received response: ${response}`);
						if (callback) callback(response.toString());
					}
				});
		} else if (responderSid === socket.id) {
			console.error("Responder cannot send messages.");
		}
	});
});
