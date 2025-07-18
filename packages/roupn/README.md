# roupn

Synchronise part of the state between different users in near realtime by sending the state's mutations to the other user via a server over a websocket.

Do note the system makes some assumptions about its users, primarily that they are good actors who do not what to harm the group they are in. For example when a message is broadcasted from one group to another it does not validate the contents of this message.

## Tasks

- Optionally allow server to require the user's device to solve a cryptographic challenge before creating or joining a room. This wastes compute time and allows open servers to not be abused.
