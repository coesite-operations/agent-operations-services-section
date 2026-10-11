# Heartbeat Tasks

At each heartbeat, please execute the following steps in order:

1. **Commit and push changes** in the 561 superrepo:
   - Check git status; if there are changes (new, modified, deleted files) that are not ignored, then:
     - Set git user name and email if not already set (use "OpenClaw Agent" and "agent@openclaw.local" or similar).
     - Add all changes: `git add -A`
     - Commit with message: "Heartbeat automated commit: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
     - Push to origin: `git push`
   - If there are no changes, skip commit/push.

2. **Review work/governance/persona/main/ directory for changes since last heartbeat**:
   - Compare current state with a stored snapshot (we can use git to see changes in that directory since last commit, or we can maintain a timestamp file).
     Since we are committing each heartbeat, we can simply look at the changes in the last commit: `git show --name-only HEAD -- work/governance/persona/main/` (if HEAD exists).
     If there is no HEAD yet, just list files.
   - Report any new, modified, or deleted files in that directory.

3. **Review recent exploration logs and provide update in chat**:
   - Check the most recent journal entries in `561/work/governance/persona/main/log/` (sorted by date).
   - Provide a brief summary of:
     * What was explored in the latest entry
     * Key insights or connections discovered
     * Any recommended tasks or follow-ups

4. **Write heartbeat report to memory log**:
   - Create a log file at `work/governance/persona/main/memory/$(date -u +'%Y-%m-%d')-heartbeat-log.md`
   - Include the same information provided in step 3 (summary of exploration logs)
   - Also include git status information from step 1 and directory changes from step 2
   - This creates a persistent record of heartbeat activities

Please perform these steps and then output the results for the heartbeat update.
