import { useCallback, useRef } from 'react';
import {
  IChartingLibraryWidget,
  ResolutionString,
  StudyInputValue,
  StudyOverrides,
} from '../../../../../public/charting_library';

// Add global chart settings property to Window object
declare global {
  interface Window {
    _globalChartSettings?: ChartSettings;
  }
}

const LOCAL_STORAGE_KEY = 'tv_chart_settings';

// Chart settings interface
export interface ChartSettings {
  resolution?: string;
  chartType?: number;
  studies?: Array<{
    id: string;
    name: string;
    metaInfo: {
      isCustomIndicator: boolean;
    };
    inputs: Record<string, StudyInputValue>;
    options?: StudyOverrides;
  }>;
}

// Default studies to add when no saved studies exist
export const DEFAULT_STUDIES = [
  // {
  //   name: 'Relative Strength Index',
  //   isCustomIndicator: false,
  //   inputs: {
  //     length: 14, // Standard RSI period
  //     source: 'close', // Price source
  //   },
  // },
];

/**
 * Chart settings management custom Hook
 * Provides functionality to save and apply chart settings
 * @param chartRef - Reference to the chart component
 */
export function useChartSettings(
  chartRef: React.RefObject<IChartingLibraryWidget | null>
) {
  // Save chart settings ref - use static variable to ensure sharing between different markets
  const chartSettingsRef = useRef<ChartSettings>(
    window._globalChartSettings || {}
  );

  // Ensure global settings object exists
  if (!window._globalChartSettings) {
    window._globalChartSettings = {};
  }

  // Save current chart settings
  const saveChartSettings = useCallback(() => {
    if (!chartRef.current) return;
    // console.log('saveChartSettings successfully')

    try {
      // Use try-catch to safely call chart method
      let chart;
      try {
        chart = chartRef?.current?.chart();
        chartRef.current?.saveChartToServer(undefined, undefined, {
          chartName: `gmxsol-chart-v${1}`,
        });
      } catch (e) {
        // Chart method not available, component might be unmounting
        return;
      }

      // Return safely if chart object is null or undefined
      if (!chart) return;

      // Save current resolution (time interval)
      const resolution = chart?.resolution();

      // Save chart type
      const chartType = chart?.chartType();

      // Save all indicators with their basic information
      // TradingView API doesn't provide direct methods to get complete indicator configuration
      const studies = chart.getAllStudies().map((study) => {
        // Important: Keep the existing study inputs if available in the global settings
        const existingStudy = window._globalChartSettings?.studies?.find(
          (s) => s.name === study.name
        );

        return {
          id: study.id,
          name: study.name,
          metaInfo: {
            isCustomIndicator: false, // Default value since API doesn't expose this directly
          },
          // Use existing inputs if available, or default to RSI inputs if it's an RSI
          inputs:
            existingStudy?.inputs ||
            (study.name === 'Relative Strength Index'
              ? { length: 14, source: 'close' }
              : ({} as Record<string, StudyInputValue>)),
        };
      });

      // If no studies were found but we had them before, preserve them
      const finalStudies =
        studies.length > 0
          ? studies
          : window._globalChartSettings?.studies || [];

      // Save settings to ref and global variable
      const settings: ChartSettings = {
        resolution,
        chartType,
        studies: finalStudies,
      };

      chartSettingsRef.current = settings;
      window._globalChartSettings = settings;

      try {
        // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to persist chart settings:', e);
      }
    } catch (err) {
      console.error('Error saving chart settings:', err);
    }
  }, [chartRef]);

  // Apply saved chart settings
  const applyChartSettings = useCallback(() => {
    if (!chartRef?.current || !chartSettingsRef?.current) return;
    // console.log('applyChartSettings successfully')

    try {
      // Use try-catch to safely call chart method
      let chart;
      try {
        chart = chartRef?.current?.chart();
      } catch (e) {
        // Chart method not available, component might be unmounting
        return;
      }

      // Return safely if chart object is null or undefined
      if (!chart) return;

      if (!chartSettingsRef.current || Object.keys(chartSettingsRef.current).length === 0) {
        try {
          const localData = localStorage.getItem('tv_chart_settings');
          if (localData) {
            const parsed: ChartSettings = JSON.parse(localData);
            chartSettingsRef.current = parsed;
            window._globalChartSettings = parsed;
          }
        } catch (e) {
          console.warn('Failed to load chart settings from localStorage:', e);
        }
      }

      const settings = chartSettingsRef.current;

      // Apply indicators first so they can start loading
      const applyStudies = () => {
        // First remove all existing indicators
        const currentStudies = chart.getAllStudies();
        currentStudies.forEach((study) => {
          try {
            void chart.removeEntity(study.id);
          } catch (error) {
            console.error('Error removing study:', error);
          }
        });

        // Using async queue to optimize indicator loading
        const applyStudyQueue = (
          studiesToApply: Array<{
            name: string;
            isCustomIndicator: boolean;
            inputs: Record<string, StudyInputValue>;
          }>
        ) => {
          if (studiesToApply.length === 0) return;

          // Apply first indicator immediately
          const study = studiesToApply[0];
          try {
            void chart.createStudy(
              study.name,
              study.isCustomIndicator,
              false,
              study.inputs
            );
          } catch (error) {
            console.error(`Failed to add study ${study.name}:`, error);
          }

          // Schedule next ones if there are more
          if (studiesToApply.length > 1) {
            setTimeout(() => applyStudyQueue(studiesToApply.slice(1)), 50);
          }
        };

        // Decide which indicators to use
        const studiesToApply =
          settings.studies && settings.studies.length > 0
            ? settings.studies.map((study) => ({
                name: study.name,
                isCustomIndicator: study.metaInfo.isCustomIndicator,
                inputs: study.inputs,
              }))
            : window._globalChartSettings?.studies ||DEFAULT_STUDIES;

        // Start applying indicators
        applyStudyQueue(studiesToApply);
      };

      // Apply indicators immediately
      applyStudies();

      // Apply other settings
      if (settings.resolution) {
        void chart.setResolution(settings.resolution as ResolutionString);
      }

      if (settings?.chartType !== undefined) {
        void chart.setChartType(settings?.chartType);
      }
    } catch (err) {
      console.error('Error applying chart settings:', err);
    }
  }, [chartRef]);

  // Get current saved settings
  const getChartSettings = useCallback((): ChartSettings => {
    // console.log('getChartSettings successfully')
    // Prioritize global settings to ensure sharing between different markets
    return window._globalChartSettings || chartSettingsRef.current;
  }, []);

  return {
    saveChartSettings,
    applyChartSettings,
    getChartSettings,
  };
}