using MongoDB.Driver;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Services
{
    public class SlotService
    {
        private readonly TimeService _timeService;
        private readonly IMongoCollection<Booking> _bookingCollection;
        private readonly IMongoCollection<AdminServices> _adminServicesCollection;

        private const int OpeningBufferMinutes = 15;
        private const int ClosingBufferMinutes = 30;
        private const int SlotIntervalMinutes = 15;
        private const int PostBookingBufferMinutes = 15;

        public SlotService(IMongoDatabase database, TimeService timeService)
        {
            _timeService = timeService;
            _bookingCollection = database.GetCollection<Booking>("Bookings");
            _adminServicesCollection = database.GetCollection<AdminServices>("AdminServices");
        }

        public async Task<SlotResponseDto> GetAvailableSlotsAsync(SlotRequestDto dto)
        {
            var response = new SlotResponseDto
            {
                Status = false,
                Message = string.Empty,
                Slots = new List<SlotDto>()
            };

            if (dto == null)
            {
                response.Message = "Invalid request.";
                return response;
            }
            if (string.IsNullOrEmpty(dto.UserId))
            {
                response.Message = "UserId is required.";
                return response;
            }
            if (string.IsNullOrEmpty(dto.StaffId))
            {
                response.Message = "StaffId is required.";
                return response;
            }
            if (dto.ServiceIds == null || dto.ServiceIds.Count == 0)
            {
                response.Message = "ServiceIds required.";
                return response;
            }
            var serviceFilter = Builders<AdminServices>.Filter.In(
                s => s.Id,
                dto.ServiceIds
            );

            var services = await _adminServicesCollection
                .Find(serviceFilter)
                .ToListAsync();

            if (services.Count != dto.ServiceIds.Count)
            {
                response.Message = "One or more services not found.";
                return response;
            }

            int totalDurationMinutes = services.Sum(s => s.Duration);

            if (totalDurationMinutes <= 0)
            {
                response.Message =
                    "Total service duration must be greater than zero.";
                return response;
            }

            var targetDate = dto.Date.Date;

            string dayOfWeek = targetDate.ToString("dddd");

            var salonTiming =
                await _timeService.GetByUserIdAndDayAsync(
                    dto.UserId,
                    dayOfWeek
                );

            if (salonTiming == null)
            {
                response.Message =
                    $"Salon timing not found for {dayOfWeek}.";
                return response;
            }

            if (!salonTiming.IsOpen)
            {
                response.Message =
                    $"Salon is closed on {dayOfWeek}.";
                return response;
            }

            int salonOpeningMinutes =
                TimeToMinutes(salonTiming.Opening);
            int salonClosingMinutes =
                TimeToMinutes(salonTiming.Closing);
            int openingMinutes =
                salonOpeningMinutes + OpeningBufferMinutes;
            int closingMinutes =
                salonClosingMinutes - ClosingBufferMinutes;
            if (openingMinutes >= closingMinutes)
            {
                response.Message =
                    "Salon operating hours too short after buffers.";
                return response;
            }

            if (totalDurationMinutes >
                (closingMinutes - openingMinutes))
            {
                response.Message =
                    "Selected services exceed available working hours.";
                return response;
            }

            var now = DateTime.Now;
            if (targetDate == now.Date)
            {
                int currentMinutes =
                    (now.Hour * 60) + now.Minute;

                if (currentMinutes > openingMinutes)
                {
                    openingMinutes = RoundUpToInterval(
                        currentMinutes,
                        SlotIntervalMinutes
                    );
                }
            }

            if (openingMinutes >= closingMinutes)
            {
                response.Status = true;
                response.Message =
                    "No available slots for the selected criteria.";
                return response;
            }

            var activeStatuses = new[]
            {
                "pending",
                "confirmed",
                "inprogress"
            };

            var bookings = await _bookingCollection
                .Find(b =>
                    b.StaffId == dto.StaffId &&
                    b.AppointmentDate >= targetDate &&
                    b.AppointmentDate < targetDate.AddDays(1) &&
                    activeStatuses.Contains(b.Status.ToLower())
                )
                .ToListAsync();

            var availableSlots = new List<SlotDto>();

            for (
                int slotStart = openingMinutes;
                slotStart <= closingMinutes;
                slotStart += SlotIntervalMinutes
            )
            {
                int slotEnd =
                    slotStart + totalDurationMinutes;

                if (slotEnd > closingMinutes)
                {
                    continue;
                }

                bool isOverlapping = bookings.Any(b =>
                {
                    int bookingStart =
                        TimeToMinutes(b.StartTime);

                    int bookingEnd =
                        TimeToMinutes(b.EndTime);

                    int occupiedStart =
                        bookingStart;

                    int occupiedEnd =
                        bookingEnd + PostBookingBufferMinutes;

                    return
                        slotStart < occupiedEnd &&
                        slotEnd > occupiedStart;
                });

                if (isOverlapping)
                {
                    continue;
                }

                availableSlots.Add(new SlotDto
                {
                    StartTime = MinutesToTime(slotStart),
                    EndTime = MinutesToTime(slotEnd),
                    IsAvailable = true
                });
            }

            response.Status = true;

            response.Message =
                availableSlots.Count > 0
                    ? "Slots retrieved successfully."
                    : "No available slots for the selected criteria.";

            response.Slots = availableSlots;

            return response;
        }

        private static int TimeToMinutes(string timeStr)
        {
            if (string.IsNullOrWhiteSpace(timeStr))
            {
                return 0;
            }

            var parts = timeStr.Split(':');

            if (parts.Length < 2)
            {
                return 0;
            }

            if (!int.TryParse(parts[0], out int hours))
            {
                return 0;
            }

            if (!int.TryParse(parts[1], out int minutes))
            {
                return 0;
            }

            return (hours * 60) + minutes;
        }

        private static string MinutesToTime(int totalMinutes)
        {
            int hours = totalMinutes / 60;
            int minutes = totalMinutes % 60;

            return $"{hours:D2}:{minutes:D2}";
        }

        private static int RoundUpToInterval(
            int minutes,
            int interval)
        {
            return ((minutes + interval - 1) / interval) * interval;
        }
    }
}