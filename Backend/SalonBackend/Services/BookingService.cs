    using MongoDB.Driver;
    using SalonBackend.Models;

    namespace SalonBackend.Services
    {
        public class BookingService
        {
            private readonly IMongoCollection<Booking> _bookingCollection;

            public BookingService(IMongoDatabase database)
            {
                _bookingCollection = database.GetCollection<Booking>("Bookings");
            }
    
            public async Task<List<Booking>> GetAllAsync()
            {
                return await _bookingCollection.Find(_ => true).ToListAsync();
            }
            
            public async Task<(List<Booking> Data, long TotalCount)> GetPagedAsync(
                int page, 
                int pageSize)
            {
                var totalCount = await _bookingCollection.CountDocumentsAsync(_ => true);
                
                var data = await _bookingCollection
                    .Find(_ => true)
                    .SortByDescending(x => x.AppointmentDate)
                    .Skip((page - 1) * pageSize)
                    .Limit(pageSize)
                    .ToListAsync();
                return (data, totalCount);
            }
    
            public async Task<Booking> GetByIdAsync(string id) 
            {
                return await _bookingCollection.Find(x => x.Id == id).FirstOrDefaultAsync();
            }

            public async Task<Booking> CreateAsync(Booking booking)
            {
                await _bookingCollection.InsertOneAsync(booking);
                return booking;
            }
        
            public async Task<bool> UpdateStatusAsync(string id, string status)
            {
                var update = Builders<Booking>.Update.Set(x => x.Status, status);
                var result = await _bookingCollection.UpdateOneAsync(x => x.Id == id, update);
                return result.ModifiedCount > 0;
            }

            public async Task<bool> DeleteAsync(string id)
            {
                var result = await _bookingCollection.DeleteOneAsync(x => x.Id == id);
                return result.DeletedCount > 0;
            }
        }
    }