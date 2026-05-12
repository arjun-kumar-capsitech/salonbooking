using MongoDB.Driver;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Services
{
    public class TimeService
    {
        private readonly IMongoCollection<TimeModel> _timeCollection;

        public TimeService(IConfiguration configuration)
        {
            var client = new MongoClient(
                configuration.GetConnectionString("MongoDB")
            );

            var database = client.GetDatabase("SalonBookingDB");

            _timeCollection =
                database.GetCollection<TimeModel>("Time");
        }

        public async Task<List<TimeModel>> GetAllAsync()
        {
            return await _timeCollection
                .Find(_ => true)
                .ToListAsync();
        }

        public async Task<TimeModel?> GetByDayAsync(string day)
        {
            return await _timeCollection
                .Find(x => x.Day == day)
                .FirstOrDefaultAsync();
        }

        public async Task<TimeModel> CreateOrUpdateAsync(TimeDto dto)
        {
            var existing = await _timeCollection
                .Find(x => x.Day == dto.Day)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                existing.Opening = dto.Opening;
                existing.Closing = dto.Closing;
                existing.IsOpen = dto.IsOpen;

                await _timeCollection.ReplaceOneAsync(
                    x => x.Id == existing.Id,
                    existing
                );

                return existing;
            }

            var model = new TimeModel
            {
                Day = dto.Day,
                Opening = dto.Opening,
                Closing = dto.Closing,
                IsOpen = dto.IsOpen,
                CreatedAt = DateTime.UtcNow
            };

            await _timeCollection.InsertOneAsync(model);

            return model;
        }

        public async Task<bool> UpdateAsync(
            string day,
            TimeDto dto
        )
        {
            var update = Builders<TimeModel>.Update
                .Set(x => x.Opening, dto.Opening)
                .Set(x => x.Closing, dto.Closing)
                .Set(x => x.IsOpen, dto.IsOpen);

            var result = await _timeCollection.UpdateOneAsync(
                x => x.Day == day,
                update
            );

            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string day)
        {
            var result = await _timeCollection.DeleteOneAsync(
                x => x.Day == day
            );

            return result.DeletedCount > 0;
        }
    }
}