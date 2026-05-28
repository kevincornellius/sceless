const activityStorage = storage.defineItem<number[]>("local:activityByHour", {
    defaultValue: new Array(24).fill(0),
});

export async function trackActivity(): Promise<void> {
    const hour = new Date().getHours();
    const arr = (await activityStorage.getValue()) ?? new Array(24).fill(0);
    arr[hour] = (arr[hour] ?? 0) + 1;
    await activityStorage.setValue([...arr]);
}

export async function getActivityByHour(): Promise<number[]> {
    return (await activityStorage.getValue()) ?? new Array(24).fill(0);
}

export async function clearActivityData(): Promise<void> {
    await activityStorage.setValue(new Array(24).fill(0));
}
