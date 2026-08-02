import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress, Stack, List, ListItem, ListItemIcon, ListItemText, FormControlLabel, Switch } from '@mui/material';
import { Link } from 'react-router';
import { fetchDynamicFields } from '../utils/dynamicFieldsUtils';
import { fetchSymptoms } from '../utils/symptomUtils';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CategoryScale
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { parseTimestamp } from '../utils/dateUtils';
import { format, startOfWeek, addWeeks, subDays, startOfDay, endOfDay } from 'date-fns';
import { enAU } from 'date-fns/locale';
import 'chartjs-adapter-date-fns';
import { renderPointStyle } from '../utils/flagStyleUtils.jsx';
import DateRangeSelector from './DateRangeSelector'; // Import the DateRangeSelector component

ChartJS.register(
  TimeScale, LinearScale, PointElement, LineElement, BarElement,
  CategoryScale, Title, Tooltip, Legend, Filler, annotationPlugin
);

const colorPalette = [
  '#A8DADC', // Soft teal
  '#457B9D', // Muted blue
  '#F4A261', // Warm peach
  '#E9C46A', // Light gold
  '#81B29A', // Sage green
  '#F1FAEE', // Very light mint
  '#E76F51', // Soft coral
  '#2A9D8F', // Calm turquoise
  '#B5838D', // Dusty mauve
  '#A5A58D', // Light olive
];

// Utility functions
const generateColors = (count) => Array.from({ length: count }, (_, i) => colorPalette[i % colorPalette.length]);

const createColorMap = (fields, data) => {
  return fields.reduce((acc, field) => {
    const uniqueValues = [...new Set(data.map(entry => entry[field.title]))];
    const colors = generateColors(uniqueValues.length);
    acc[field.title] = Object.fromEntries(uniqueValues.map((value, index) => [value, colors[index]]));
    return acc;
  }, {});
};

// Components
const BooleanFieldsList = React.memo(({ booleanFields, toggledFields, onToggle }) => {
  return (
    <Box sx={{ marginBottom: 2 }}>
      <List dense>
        {booleanFields.map((field) => (
          <ListItem key={field.title}>
            <ListItemIcon>
              <svg width="16" height="16" viewBox="0 0 16 16">
                {renderPointStyle(field.pointStyle || 'star', field.pointColor || 'red')}
              </svg>
            </ListItemIcon>
            <ListItemText 
              primary={field.title}
              secondary={`Style: ${field.pointStyle || 'star'}`}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!toggledFields[field.title]}
                  onChange={() => onToggle(field.title)}
                  name={field.title}
                />
              }
              label="Show"
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
});

const ChartContainer = React.memo(({ title, children }) => (
  <Box sx={{ marginBottom: 4, width: '100%', height: 400 }}>
    <Typography variant="h6" gutterBottom>{title}</Typography>
    {children}
  </Box>
));

const SymptomAnalysis = ({ user }) => {
  const [symptomData, setSymptomData] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggledFields, setToggledFields] = useState([]);
  
  // Set default start and end dates
  const defaultStartDate = startOfDay(subDays(new Date(), 30)); // 30 days ago
  const defaultEndDate = endOfDay(new Date()); // Today
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const fetchData = useCallback(async () => {
    if (!user?.uid) {
      setError('No user found');
      setLoading(false);
      return;
    }

    try {
      const [fields, data] = await Promise.all([
        fetchDynamicFields(user.uid),
        fetchSymptoms(user.uid, 'asc', startDate, endDate)
      ]);
      setDynamicFields(fields);
      setSymptomData(data);
      setToggledFields(fields.reduce((acc, field) => {
        if (field.type === 'boolean') acc[field.title] = true;
        return acc;
      }, {}));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error fetching symptom data');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = useCallback((fieldTitle) => {
    setToggledFields(prev => ({ ...prev, [fieldTitle]: !prev[fieldTitle] }));
  }, []);

  const parsedSymptomData = useMemo(() => 
    symptomData.map(entry => ({
      ...entry,
      parsedDate: parseTimestamp(entry.symptomDate)
    })),
    [symptomData]
  );

  const { booleanFields, selectFields, numericFields } = useMemo(() => ({
    booleanFields: dynamicFields.filter(field => field.type === 'boolean'),
    selectFields: dynamicFields.filter(field => field.type === 'select'),
    numericFields: dynamicFields.filter(field => !['boolean', 'text', 'select'].includes(field.type))
  }), [dynamicFields]);

  const colorMaps = useMemo(() => createColorMap(selectFields, parsedSymptomData), [selectFields, parsedSymptomData]);

  const prepareChartData = useMemo(() => {
    if (parsedSymptomData.length === 0) return [];

    return numericFields.map(field => {
      const data = parsedSymptomData.map(entry => ({
        x: entry.parsedDate,
        y: entry[field.title]
      }));

      const booleanAnnotations = booleanFields
        .filter(bField => toggledFields[bField.title])
        .flatMap(bField => 
          parsedSymptomData
            .filter(entry => entry[bField.title])
            .map(entry => ({
              type: 'point',
              xValue: entry.parsedDate,
              yValue: entry[field.title],
              backgroundColor: bField.pointColor || 'red',
              borderColor: bField.pointColor || 'red',
              borderWidth: 2,
              radius: 6,
              pointStyle: bField.pointStyle || 'star'
            }))
        );

      return {
        attribute: field.title,
        datasets: [{
          label: field.title,
          data,
          borderColor: '#9900f6',
          backgroundColor: 'rgba(153, 0, 246, 0.2)',
          fill: true,
          borderWidth: 1,
          tension: 0.3,
          pointRadius: 2
        }],
        options: {
          plugins: {
            annotation: { annotations: booleanAnnotations }
          }
        }
      };
    });
  }, [parsedSymptomData, numericFields, booleanFields, toggledFields]);

  const prepareWeeklyStackedData = useMemo(() => {
    if (parsedSymptomData.length === 0 || selectFields.length === 0) return null;

    const dateRange = parsedSymptomData.map(entry => entry.parsedDate);
    const startDate = startOfWeek(new Date(Math.min(...dateRange)));
    const endDate = new Date(Math.max(...dateRange));

    const weeks = [];
    let currentWeek = startDate;
    while (currentWeek <= endDate) {
      weeks.push(format(currentWeek, 'yyyy-MM-dd'));
      currentWeek = addWeeks(currentWeek, 1);
    }

    return selectFields.map(field => {
      const datasets = [...new Set(parsedSymptomData.map(entry => entry[field.title]))]
        .filter(value => value !== undefined && value !== null && value !== '')
        .map(value => ({
          label: value,
          data: weeks.map(weekStart => {
            const weekEnd = addWeeks(new Date(weekStart), 1);
            return parsedSymptomData.filter(entry => 
              entry.parsedDate >= new Date(weekStart) && 
              entry.parsedDate < weekEnd && 
              entry[field.title] === value
            ).length;
          }),
          backgroundColor: colorMaps[field.title][value],
        }));

      // Filter out weeks with no data
      const weeksWithData = weeks.filter((_, index) => 
        datasets.some(dataset => dataset.data[index] > 0)
      );

      return {
        fieldTitle: field.title,
        chartData: {
          labels: weeksWithData.map(week => format(new Date(week), 'dd MMM yy')),
          datasets: datasets.map(dataset => ({
            ...dataset,
            data: dataset.data.filter((_, index) => 
              datasets.some(d => d.data[index] > 0)
            ),
          })),
        }
      };
    });
  }, [parsedSymptomData, selectFields, colorMaps]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (prepareChartData.length === 0) return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Symptom Analysis</Typography>
      <Typography variant="body1" color="error" sx={{ backgroundColor: '#ffebee', padding: 2, borderRadius: 4 }}>
        No symptoms available to analyse. Go to  
        <Link to="/track" style={{ marginLeft: '4px', textDecoration: 'underline', color: 'blue' }}>
          tracking
        </Link>
        .
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Symptom Analysis</Typography>

      <Box sx={{ marginBottom: 4, width: '100%' }}>
        <Typography variant="h6" gutterBottom>Select Date Range</Typography>
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onDateChange={(newStartDate, newEndDate) => {
            setStartDate(newStartDate);
            setEndDate(newEndDate);
          }}
        />
      </Box>

      <Stack spacing={2} direction="column">
        {prepareChartData.map((data, index) => (
          data.datasets[0].data.length > 0 && (
            <ChartContainer key={index} title={data.attribute}>
              <Line 
                data={{ datasets: data.datasets }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `${data.attribute} Over Time` },
                    tooltip: {
                      callbacks: {
                        title: (context) => format(new Date(context[0].parsed.x), 'dd MMM', { locale: enAU }),
                        afterBody: (context) => {
                          const entry = parsedSymptomData[context[0].dataIndex];
                          return booleanFields
                            .filter(field => entry[field.title])
                            .map(field => `${field.title}: Yes`);
                        }
                      }
                    },
                    annotation: { annotations: data.options?.plugins?.annotation?.annotations || [] }
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: { unit: 'day', displayFormats: { day: 'dd MMM' } },
                      title: { display: true, text: 'Date' },
                      adapters: { date: { locale: enAU } },
                    },
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: data.attribute },
                      ticks: { callback: (value) => Math.floor(value) === value ? value : null }
                    }
                  }
                }}
              />
            </ChartContainer>
          )
        ))}
      </Stack>
      
      <BooleanFieldsList 
        booleanFields={booleanFields}
        toggledFields={toggledFields} 
        onToggle={handleToggle}
      />

      {prepareWeeklyStackedData?.map((fieldData, index) => (
        fieldData.chartData.datasets.some(dataset => dataset.data.length > 0) && (
          <ChartContainer key={index} title={fieldData.fieldTitle}>
            <Bar
              data={fieldData.chartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  x: { stacked: true, title: { display: true, text: 'Week Starting' } },
                  y: { 
                    stacked: true, 
                    title: { display: true, text: 'Occurrences' },
                    ticks: { stepSize: 1 }
                  }
                },
                plugins: {
                  title: { display: true, text: `Weekly Distribution of ${fieldData.fieldTitle}` },
                  tooltip: {
                    callbacks: {
                      title: (context) => `Week of ${context[0].label}`,
                      label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                    }
                  }
                }
              }}
            />
          </ChartContainer>
        )
      ))}
    </Box>
  );
};

export default React.memo(SymptomAnalysis);
