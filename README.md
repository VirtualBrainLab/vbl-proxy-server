# VirtualBrainLab Proxy Server

This server runs a Socket.IO connection on port 5000

## Connect as sender

To connect as a sender send the `ID` message with a list of strings `["your-id-string", "send"]`. Your client will be registered as a sender.

## Connect as receiver

To connect as a sender send the `ID` message with a list of strings `["your-id-string", "receive"]`. Your client will be registered as a receiver.

## Messages (Sender -> Receiver)

By default, all messages from senders except the restricted messages (see below) are automatically forwarded to all senders with a matching ID.

### Reverse messages (Receiver -> Sender)

Some message headers are restricted and will not be forwarded from senders to receivers. These are used only to send data back to the sender from the receiver.

| Message      | Data      | Purpose    |
|--------------|-----------|------------|
| log      | string | Send logging data       |
| log-warning      | string  | Send warning data       |
| log-error      | string  | Send error data       |
| CameraImgMeta | ... | custom |
| CameraImg | ... | custom |
| ReceiveCameraImgMeta      | ...  | custom       |
| ReceiveCameraImg      | ...  | custom       |
| NeuronCallback | ... | custom |
| urchin-loaded-callback | ... | custom |
| urchin-dock-callback | ... | custom |
