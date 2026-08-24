import * as signalR from "@microsoft/signalr";

export const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5296/bookingHub", {
    withCredentials: true,
    transport: signalR.HttpTransportType.WebSockets,
  })
  .withAutomaticReconnect([0, 3000, 5000, 10000, 20000])
  .configureLogging(signalR.LogLevel.Information)
  .build();

let starting = false;

export const startSignalR = async (): Promise<boolean> => {
  if (connection.state === signalR.HubConnectionState.Connected) return true;
  if (starting || connection.state === signalR.HubConnectionState.Connecting) return false;

  starting = true;

  try {
    await connection.start();
    console.log("SignalR Connected Successfully!");
    console.log("Connection ID:", connection.connectionId);
    return true;
  } catch (error) {
    console.error("SignalR Connection Error:", error);
    return false;
  } finally {
    starting = false;
  }
};

connection.onreconnecting((error) => {
  console.warn("SignalR Reconnecting...", error);
});

connection.onreconnected((connectionId) => {
  console.log("SignalR Reconnected! Connection ID:", connectionId);
});

connection.onclose((error) => {
  if (error) console.error("SignalR Connection Closed:", error);
  else console.log("SignalR Connection Closed");
});