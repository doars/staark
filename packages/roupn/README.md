# roupn

Synchronise part of the state between different users in near realtime by sending the state's mutations to the other user via a server over a websocket.

Do note the system makes some assumptions about its users, primarily that they are good actors who do not what to harm the group they are in. For example when a message is broadcasted from one group to another it does not validate the contents of this message.

## Tasks

- Remove the password. Instead when joining the joining party should be shown the verification code and provide it via another channel to the creator for them to enter before the user is given the shared key. The other way around is not do-able since then the users will need to figure out which uuid corresponds to which person. This can easily be done wrong since a lot of users can suddenly join when the room code is leaked.
- The message buffer should only hold onto messages until the last full_sync. Since it can't decrypt them and a resync is only a concept of the syncing extension it should be a configurable maximum number of messages until it starts remove the earliest message received.
- Ensure that the application can derive the state the connection is in so it can show to the user it is establishing a connection.
