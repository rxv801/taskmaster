// Spawns the Python CV worker as a child process, manages its lifecycle (start/restart/kill), 
// and connects to its WebSocket. Forwards CV events (gaze, phone) to the rest of the app.