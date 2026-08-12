import re

with open("server.ts", "r") as f:
    content = f.read()

target = """      if (err?.message?.includes("Unable to detect a Project Id") || err?.message?.includes("Could not load the default credentials")) {
          if (!firestoreDisabled) {
              firestoreDisabled = true;
              console.log("ℹ️ Firestore persistence disabled (FIREBASE_SERVICE_ACCOUNT variable not set on Vercel). Server operating in-memory.");
          }
      } else {
          console.warn(`Firestore ${action} note:`, err?.message || err);
      }"""

replace = """      if (err?.message?.includes("Unable to detect a Project Id") || err?.message?.includes("Could not load the default credentials")) {
          if (!firestoreDisabled) {
              firestoreDisabled = true;
              console.log("ℹ️ Firestore persistence disabled (FIREBASE_SERVICE_ACCOUNT variable not set on Vercel). Server operating in-memory.");
          }
      } else if (err?.message?.includes("RESOURCE_EXHAUSTED")) {
          if (!firestoreDisabled) {
              firestoreDisabled = true;
              console.log("ℹ️ Firestore write/getAll failed: RESOURCE_EXHAUSTED. Falling back to local/in-memory storage.");
          }
      } else {
          console.warn(`Firestore ${action} note:`, err?.message || err);
      }"""

if target in content:
    content = content.replace(target, replace)
    print("Patched handleFirestoreError")
else:
    print("Target not found in server.ts")

with open("server.ts", "w") as f:
    f.write(content)
