using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.CookiePolicy;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;
using System.Text;
using Hangfire;
using Hangfire.Mongo;
using NetEscapades.AspNetCore.SecurityHeaders;
using SalonBackend;
using SalonBackend.Hubs;
using SalonBackend.Services;
using SalonBackend.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSecurityHeaders();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Salon Booking API",
        Version = "v1",
        Description = "API for Salon Booking Application"
    });
});

var mongoConnectionString =
    builder.Configuration.GetConnectionString("MongoDB")
    ?? "mongodb://localhost:27017";

var databaseName =
    builder.Configuration["MongoDB:DatabaseName"]
    ?? "SalonBookingDB";

var mongoClient = new MongoClient(mongoConnectionString);
var database = mongoClient.GetDatabase(databaseName);

builder.Services.AddSingleton<IMongoDatabase>(database);
builder.Services.AddHangfire(config =>
{
    config.UseMongoStorage(
        mongoConnectionString,
        databaseName
    );
});

builder.Services.AddHangfireServer();
builder.Services.AddApplicationServices();

var jwtSecret =
    builder.Configuration["Jwt:Secret"]
    ?? "your-super-secret-jwt-key-minimum-32-characters-long-here";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecret)
            )
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Cookies["jwt_token"];

                if (!string.IsNullOrEmpty(token))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.HttpOnly = HttpOnlyPolicy.Always;
    options.Secure = CookieSecurePolicy.Always;
    options.MinimumSameSitePolicy = SameSiteMode.Strict;
});

var app = builder.Build();

app.UseCors("AllowFrontend");

var securityHeadersPolicy =
    app.Services.GetRequiredService<HeaderPolicyCollection>();

app.UseSecurityHeaders(securityHeadersPolicy);

app.UseSwagger();

app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint(
        "/swagger/v1/swagger.json",
        "Salon Booking API v1"
    );

    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.UseHangfireDashboard();
RecurringJob.AddOrUpdate<BookingService>(
    "clear-pending-bookings",
    service => service.ClearPendingBookings(),
    Cron.Daily
);
app.MapControllers();
app.MapHub<BookingHub>("/bookingHub");
app.MapGet("/", () => Results.Redirect("/swagger"));
app.Run();