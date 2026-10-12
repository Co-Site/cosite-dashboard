// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Observation } from "../dataLayers/sta";
import { TimeRange } from "./timeRange";

const DAY = 24 * 60 * 60 * 1000;

/** Length of the sections that observations are aggregated into (in local time). */
export type BucketSize = "hour" | "day" | "week";

/** Hourly sections for up to 2 days, daily ones for up to 45 days, weekly ones beyond. */
export function bucketSize(range: TimeRange): BucketSize {
    const duration = range.to.getTime() - range.from.getTime();
    if (duration <= 2 * DAY) {
        return "hour";
    }
    return duration <= 45 * DAY ? "day" : "week";
}

/** A section of time with the mean of its observations. */
export interface Bucket {
    /** Start and end (exclusive) in milliseconds since epoch. */
    start: number;
    end: number;
    mean: number;
    count: number;
}

/**
 * Aggregates the observations (oldest first) into sections of the given size.
 * Sections without observations are omitted.
 */
export function meanPerBucket(observations: Observation[], size: BucketSize): Bucket[] {
    const buckets: Bucket[] = [];
    let current: { start: number; sum: number; count: number } | undefined;
    const finish = () => {
        if (current) {
            buckets.push({
                start: current.start,
                end: nextBucketStart(current.start, size),
                mean: current.sum / current.count,
                count: current.count
            });
        }
    };
    for (const { time, value } of observations) {
        const start = bucketStart(time, size);
        if (current?.start !== start) {
            finish();
            current = { start, sum: 0, count: 0 };
        }
        current.sum += value;
        current.count++;
    }
    finish();
    return buckets;
}

/** Start of the section containing `time` (weeks start on Monday). */
export function bucketStart(time: number, size: BucketSize): number {
    const date = new Date(time);
    if (size === "hour") {
        date.setMinutes(0, 0, 0);
        return date.getTime();
    }
    date.setHours(0, 0, 0, 0);
    if (size === "week") {
        date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    }
    return date.getTime();
}

function nextBucketStart(start: number, size: BucketSize): number {
    const date = new Date(start);
    if (size === "hour") {
        date.setHours(date.getHours() + 1);
    } else {
        date.setDate(date.getDate() + (size === "week" ? 7 : 1));
    }
    return date.getTime();
}
