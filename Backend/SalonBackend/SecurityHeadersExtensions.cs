using NetEscapades.AspNetCore.SecurityHeaders;

namespace SalonBackend.Extensions;

public static class SecurityHeadersExtensions
{
    public static IServiceCollection AddSecurityHeaders(
        this IServiceCollection services)
    {
        var policy = new HeaderPolicyCollection()
            .AddFrameOptionsDeny()
            .AddContentTypeOptionsNoSniff()
            .AddXssProtectionEnabled()
            .AddReferrerPolicyStrictOriginWhenCrossOrigin()
            .AddStrictTransportSecurityMaxAgeIncludeSubDomains()
            .AddPermissionsPolicy(policy =>
            {
                policy.AddCamera().None();
                policy.AddMicrophone().None();
                policy.AddUsb().None();
                policy.AddPayment().None();
                policy.AddFullscreen().Self();
                policy.AddAutoplay().Self();
            })
            .RemoveServerHeader();

        services.AddSingleton(policy);
        return services;
    }
}