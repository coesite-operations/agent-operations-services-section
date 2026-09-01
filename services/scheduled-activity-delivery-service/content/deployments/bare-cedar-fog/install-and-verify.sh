#!/bin/sh
# Install only. This script never starts or enables the timer.
set -eu

service_root=${SCHEDULED_ACTIVITY_DELIVERY_SERVICE_ROOT:-"$HOME/info/lib/emsenn/services/561-group/services/operations-services-section/services/agent-services-section/services/scheduled-activity-delivery-service"}
unit_directory=${XDG_CONFIG_HOME:-"$HOME/.config"}/systemd/user
deployment="$service_root/content/deployments/bare-cedar-fog"
timer=scheduled-activity-delivery-run-due.timer

case ${1:-} in
  "") preflight_mode=normal ;;
  --staged) preflight_mode=structural-only ;;
  *) echo "usage: $0 [--staged]" >&2; exit 2 ;;
esac

if ! systemctl --user show-environment >/dev/null 2>&1; then
  echo "refusing installation: the user systemd manager is not reachable" >&2
  exit 2
fi

if systemctl --user is-enabled --quiet "$timer"; then
  echo "refusing to replace an enabled $timer; disable it and inspect its current state first" >&2
  exit 2
fi
if systemctl --user is-active --quiet "$timer"; then
  echo "refusing to replace an active $timer; stop it and inspect its current state first" >&2
  exit 2
fi

if [ "$preflight_mode" = structural-only ]; then
  "$HOME/.local/bin/node" "$service_root/scripts/bare-cedar-fog-preflight.mjs" --service-root "$service_root" --structural-only
else
  "$HOME/.local/bin/node" "$service_root/scripts/bare-cedar-fog-preflight.mjs" --service-root "$service_root"
fi
systemd-analyze verify "$deployment/scheduled-activity-delivery-run-due.service" "$deployment/$timer"
install -d -m 0755 "$unit_directory"
install -m 0644 "$deployment/scheduled-activity-delivery-run-due.service" "$unit_directory/scheduled-activity-delivery-run-due.service"
install -m 0644 "$deployment/$timer" "$unit_directory/$timer"
systemctl --user daemon-reload

if systemctl --user is-enabled --quiet "$timer"; then
  echo "refusing unsafe result: $timer became enabled during installation" >&2
  exit 2
fi
if systemctl --user is-active --quiet "$timer"; then
  echo "refusing unsafe result: $timer became active during installation" >&2
  exit 2
fi
systemctl --user status "$timer" --no-pager || true
echo "installed and verified disabled: $timer"
