using Microsoft.Extensions.DependencyInjection;
using SalonBackend.Services;

namespace SalonBackend;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services)
    {
        services.AddScoped<UserService>();
        services.AddScoped<SlotService>();
        services.AddScoped<AdminService>();
        services.AddScoped<StaffService>();
        services.AddScoped<BookingService>();
        services.AddScoped<TimeService>();
        services.AddScoped<CompanyService>();
        return services;
    }
}