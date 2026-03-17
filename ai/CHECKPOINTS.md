# Checkpoint Placement For Production

Place model checkpoints in ai/checkpoints before running Docker Compose.

Required files:
- brain_best_model.pth
- liver_best_model.pth
- breast_best_model.pth

Inside the AI container these are available at:
- /app/checkpoints/brain_best_model.pth
- /app/checkpoints/liver_best_model.pth
- /app/checkpoints/breast_best_model.pth

Optional future model:
- spinal_cord_best_model.pth

If you add spinal cord support, set TUMOR_CHECKPOINT_SPINAL_CORD in docker-compose.yml.
