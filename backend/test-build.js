const Builder = require('./src/services/Builder.js').default;
const path = require('path');
const fs = require('fs');

async function test() {
    console.log("Starting test build...");
    const builder = new Builder('https://google.com', 'TestApp', 'com.site2app.testapp', {
        buildId: 'test_build_123',
        features: { pushNotifications: true },
        googleServicesJson: JSON.stringify({
            "project_info": {
                "project_number": "123456789",
                "project_id": "test-project",
                "storage_bucket": "test-project.appspot.com"
            },
            "client": [
                {
                    "client_info": {
                        "mobilesdk_app_id": "1:123456789:android:123456789",
                        "android_client_info": {
                            "package_name": "com.site2app.testapp"
                        }
                    },
                    "oauth_client": [],
                    "api_key": [
                        {
                            "current_key": "dummy_key"
                        }
                    ],
                    "services": {
                        "appinvite_service": {
                            "other_platform_oauth_client": []
                        }
                    }
                }
            ],
            "configuration_version": "1"
        })
    });

    try {
        const result = await builder.buildApk();
        console.log("Build Success:", result);
    } catch (e) {
        console.error("Build Crashed!", e);
        process.exit(1);
    }
}
test();
