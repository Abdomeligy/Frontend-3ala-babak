import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_DRIVER_TRACKING';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  // منطق التحديث في الخلفية...
});