package app.pennytracker.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS },
            alias = "sms"
        )
    }
)
public class SmsPlugin extends Plugin {
    private static SmsPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static SmsPlugin getInstance() {
        return instance;
    }

    @PluginMethod
    public void readInboxSms(PluginCall call) {
        if (getPermissionState("sms") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }

        readMessages(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED) {
            readMessages(call);
        } else {
            call.reject("Permission to read SMS was denied by the user.");
        }
    }

    private void readMessages(PluginCall call) {
        JSArray messages = new JSArray();
        ContentResolver cr = getContext().getContentResolver();
        Uri uri = Uri.parse("content://sms/inbox");
        int limit = call.getInt("limit", 150);

        try (Cursor cursor = cr.query(uri, new String[]{"_id", "address", "body", "date"}, null, null, "date DESC LIMIT " + limit)) {
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    JSObject item = new JSObject();
                    item.put("id", cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                    item.put("sender", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    item.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    item.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    messages.put(item);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            call.reject("Failed to query SMS: " + e.getMessage());
            return;
        }

        JSObject ret = new JSObject();
        ret.put("messages", messages);
        call.resolve(ret);
    }

    public void onIncomingSms(String sender, String body, long timestamp) {
        JSObject data = new JSObject();
        data.put("sender", sender);
        data.put("body", body);
        data.put("date", timestamp);
        notifyListeners("smsReceived", data);
    }
}
