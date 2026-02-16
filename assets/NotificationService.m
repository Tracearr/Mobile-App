/**
 * Notification Service Extension for Tracearr
 * Downloads and attaches images to rich push notifications on iOS
 */

#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>

@interface NotificationService : UNNotificationServiceExtension
@property (nonatomic, strong) void (^contentHandler)(UNNotificationContent *contentToDeliver);
@property (nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;
@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request withContentHandler:(void (^)(UNNotificationContent * _Nonnull))contentHandler {
    self.contentHandler = contentHandler;
    self.bestAttemptContent = [request.content mutableCopy];

    // Get the image URL from richContent.image in the notification payload
    NSDictionary *richContent = request.content.userInfo[@"richContent"];
    NSString *imageUrlString = nil;

    if ([richContent isKindOfClass:[NSDictionary class]]) {
        imageUrlString = richContent[@"image"];
    }

    // If no image URL, deliver notification as-is
    if (!imageUrlString || imageUrlString.length == 0) {
        self.contentHandler(self.bestAttemptContent);
        return;
    }

    NSURL *imageUrl = [NSURL URLWithString:imageUrlString];
    if (!imageUrl) {
        self.contentHandler(self.bestAttemptContent);
        return;
    }

    // Download the image
    NSURLSessionDownloadTask *downloadTask = [[NSURLSession sharedSession] downloadTaskWithURL:imageUrl completionHandler:^(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (error || !location) {
            // Failed to download, deliver notification without image
            self.contentHandler(self.bestAttemptContent);
            return;
        }

        // Determine file extension from response or URL
        NSString *fileExtension = @"jpg";
        NSString *mimeType = [(NSHTTPURLResponse *)response MIMEType];
        if ([mimeType containsString:@"png"]) {
            fileExtension = @"png";
        } else if ([mimeType containsString:@"gif"]) {
            fileExtension = @"gif";
        } else if ([mimeType containsString:@"webp"]) {
            fileExtension = @"webp";
        }

        // Move to a location with proper extension (UUID prevents race conditions)
        NSString *tempFilePath = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"notification_image_%@.%@", [[NSUUID UUID] UUIDString], fileExtension]];
        NSURL *tempFileUrl = [NSURL fileURLWithPath:tempFilePath];

        NSError *moveError = nil;
        [[NSFileManager defaultManager] moveItemAtURL:location toURL:tempFileUrl error:&moveError];

        if (moveError) {
            self.contentHandler(self.bestAttemptContent);
            return;
        }

        // Create and attach the image
        NSError *attachmentError = nil;
        UNNotificationAttachment *attachment = [UNNotificationAttachment attachmentWithIdentifier:@"image" URL:tempFileUrl options:nil error:&attachmentError];

        if (attachment && !attachmentError) {
            self.bestAttemptContent.attachments = @[attachment];
        }

        self.contentHandler(self.bestAttemptContent);
    }];

    [downloadTask resume];
}

- (void)serviceExtensionTimeWillExpire {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content,
    // otherwise the original push payload will be used.
    if (self.contentHandler && self.bestAttemptContent) {
        self.contentHandler(self.bestAttemptContent);
    }
}

@end
