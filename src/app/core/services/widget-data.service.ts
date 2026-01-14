import { Injectable } from '@angular/core';
import { ReadingsService } from './readings.service';
import { TranslationService } from './translation.service';
import { WidgetBridgePlugin } from 'capacitor-widget-bridge';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

@Injectable({
  providedIn: 'root',
})
export class WidgetDataService {
  constructor(
    private readingsService: ReadingsService,
    private translationService: TranslationService
  ) {}

  async updateWidgetData() {
    const readings = await this.readingsService.getAllReadings(2);
    if (readings.readings.length === 0) {
      return;
    }

    const lastReading = readings.readings[0];
    const trend = this.calculateTrend(readings.readings);
    const timeInRange = await this.readingsService.getStatistics('day');

    const widgetData = {
      glucoseValue: `${lastReading.value} ${lastReading.units}`,
      lastUpdated: this.formatTimeAgo(lastReading.time),
      trendArrow: trend,
      timeInRange: timeInRange.timeInRange,
      status: lastReading.status,
    };

    await WidgetBridgePlugin.setItem({
      key: 'widgetData',
      value: JSON.stringify(widgetData),
      group: 'group.io.diabetactic.app',
    });

    await WidgetBridgePlugin.reloadAllTimelines();
  }

  private calculateTrend(readings: LocalGlucoseReading[]): string {
    if (readings.length < 2) {
      return '→';
    }
    const last = readings[0].value;
    const previous = readings[1].value;

    if (last > previous) {
      return '↑';
    } else if (last < previous) {
      return '↓';
    } else {
      return '→';
    }
  }

  private formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return this.translationService.instant('widget.timeAgo.justNow');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.translationService.instant('widget.timeAgo.minutes', { count: diffInMinutes });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.translationService.instant('widget.timeAgo.hours', { count: diffInHours });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return this.translationService.instant('widget.timeAgo.days', { count: diffInDays });
  }
}
