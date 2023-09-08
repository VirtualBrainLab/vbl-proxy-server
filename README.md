# VirtualBrainLab Proxy Server

This server runs both a Socket.IO (port 5000) and WebSocket (port 5001) server on the same Node.JS application.

## Connect as sender

To connect as a sender send the `ID` message with a list of strings `["your-id-string", "send"]`. Your client will be registered as a sender.

## Connect as receiver

To connect as a sender send the `ID` message with a list of strings `["your-id-string", "receive"]`. Your client will be registered as a sender.

## Messages (Sender -> Receiver)

By default, all messages from senders except the restricted messages (see below) are automatically forwarded to all senders with a matching ID.

### Reverse messages (Receiver -> Sender)

Some message headers are restricted and will not be forwarded from senders to receivers. These are used only to send data back to the sender from the receiver.

| Message      | Data      | Purpose    |
|--------------|-----------|------------|
| ID | [string, string]      | Register a receiver with the server       |
| log      | string | Send logging data       |
| log-warning      | string  | Send warning data       |
| log-error      | string  | Send error data       |
| ReceiveCameraImgMeta      | ...  | custom       |
| ReceiveCameraImg      | ...  | custom       |
