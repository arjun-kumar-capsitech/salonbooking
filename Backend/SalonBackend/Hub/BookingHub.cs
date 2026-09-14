using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace SalonBackend.Hubs
{
    public class BookingHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"Connected : {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Disconnected : {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
        public async Task SendBookingUpdate(object booking)
        {
            await Clients.All.SendAsync("BookingUpdated", booking);
        }

        public async Task SendSlotBooked(object booking)
        {
            await Clients.All.SendAsync("SlotBooked", booking);
        }

        public async Task SendSlotReleased(string bookingId)
        {
            await Clients.All.SendAsync("SlotReleased", bookingId);
        }

        public async Task SendBookingStatusChanged(string bookingId, string status)
        {
            await Clients.All.SendAsync("BookingStatusChanged", new { Id = bookingId, Status = status });
        }
    }
}