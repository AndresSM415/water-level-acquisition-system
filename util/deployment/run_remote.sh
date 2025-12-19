#!/user/bin/env bash
set -e

# Get arguments or use defaults
PI_USER="${1}"
PI_HOST="${2}"
PI_PATH="/home/${PI_USER}/water-level-acquisition-system"

echo "Syncing project wth $PI_USER@$PI_HOST..."
rsync -avz --delete \
	--exclude "doc/"  \
	--exclude ".git/" \
	--exclude ".gitignore" \
	--exclude ".venv/" \
	--exclude ".vscode/" \
	--exclude "README.md" \
	--exclude ".idea/" \
	--exclude "__pycache__/" \
	--exclude "node_modules/" \
	--exclude "CHANGELOG.md" \
	--exclude "dist/" \
	. ${PI_USER}@${PI_HOST}:${PI_PATH}

echo "Running project remotely..."
ssh -t ${PI_USER}@${PI_HOST} "cd ${PI_PATH}/sampler && /home/${PI_USER}/.local/bin/uv run -m src.sampler"

