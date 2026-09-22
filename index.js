// expo-task-manager loads this bundle with no UI to run a background task and
// only finds tasks whose module has already evaluated. The router reaches
// backgroundTasks through the app tree, but nothing guarantees it, so the entry
// requires it outright. It comes second to leave startup order as it was.
import 'expo-router/entry';
import './src/lib/backgroundTasks';
