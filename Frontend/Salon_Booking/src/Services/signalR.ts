import * as signalR from "@microsoft/signalr";

export const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5296/bookingHub", {
    withCredentials: true,
    transport: signalR.HttpTransportType.WebSockets,
  })
  .withAutomaticReconnect([0, 3000, 5000, 10000, 20000])
  .configureLogging(signalR.LogLevel.Information)
  .build();

export const startSignalR = async () => {
  try {
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      console.log("Starting SignalR connection...");
      await connection.start();
      console.log("SignalR Connected Successfully!");
      console.log("Connection ID:", connection.connectionId);
      return true;
    }

    if (connection.state === signalR.HubConnectionState.Connected) {
      console.log("SignalR already connected");
      return true;
    }

    console.log(`SignalR state: ${connection.state}`);
    return false;
  } catch (error) {
    console.error("SignalR Connection Error:", error);

    setTimeout(() => {
      console.log("Retrying SignalR connection...");
      startSignalR();
    }, 5000);

    return false;
  }
};

connection.onreconnecting((error) => {
  console.warn("SignalR Reconnecting...", error);
});

connection.onreconnected((connectionId) => {
  console.log("SignalR Reconnected! Connection ID:", connectionId);
});

connection.onclose((error) => {
  console.error("SignalR Connection Closed:", error);
});