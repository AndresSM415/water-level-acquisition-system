#!/user/bin/env bash
set -e

PI_USER="dr_control"
PI_HOST="192.168.1.5"
PI_PATH="/home/${PI_USER}/dr_control_project"



echo "Syncing project to Raspberry Pi..."
rsync -avz --delete \
	--exclude "doc/"  \
	--exclude ".git/" \
	--exclude ".gitignore" \
	--exclude ".venv/" \
	--exclude ".vscode/" \
	--exclude "README.md" \
	--exclude ".idea/" \
	--exclude "__pycache__/" \
	--exclude "util/" \
	../. ${PI_USER}@${PI_HOST}:${PI_PATH}

echo "Running project remotely..."
ssh -t ${PI_USER}@${PI_HOST} "cd ${PI_PATH}/sampler && /home/${PI_USER}/.local/bin/uv run -m src.sampler"

