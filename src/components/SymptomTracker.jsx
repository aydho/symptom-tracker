import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  TextField, Select, MenuItem, Box, Typography, Switch, 
  FormControlLabel, FormControl, InputLabel, IconButton,
  CircularProgress, Slider
} from '@mui/material';
import { Link } from 'react-router';
import { DatePicker } from '@mui/x-date-pickers'; // Import DatePicker
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { fetchDynamicFields } from '../utils/dynamicFieldsUtils';
import { fetchSymptoms, addSymptom, updateSymptom } from '../utils/symptomUtils';
import { startOfDay, endOfDay, isSameDay, addDays, subDays } from 'date-fns';
import { styled } from '@mui/material/styles';
import { parseTimestamp } from '../utils/dateUtils';
import { debounce } from 'lodash'; // Make sure to install lodash if you haven't already

const ColouredBackIcon = styled(ArrowBackIosNewIcon)(({ theme }) => ({
  color: theme.palette.icon.main, // Using the color from the theme
}));

const ColouredForwardIcon = styled(ArrowForwardIosIcon)(({ theme }) => ({
  color: theme.palette.icon.main, // Using the color from the theme
}));

function SymptomTracker({ user }) {
  const [symptom, setSymptom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dynamicFields, setDynamicFields] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [localSliderValues, setLocalSliderValues] = useState({});

  const getDynamicFields = useCallback(async () => {
    try {
      const fields = await fetchDynamicFields(user.uid, 50, 'desc');
      setDynamicFields(fields);
    } catch (err) {
      console.error('Error fetching dynamic fields:', err);
    }
  }, [user.uid]);

  useEffect(() => {
    getDynamicFields();
  }, [getDynamicFields]);

  const getEntryForDate = useCallback(async (date) => {
    if (!user.uid) return;

    setIsLoading(true);
    try {
      const symptoms = await fetchSymptoms(user.uid);
      const matchingSymptom = symptoms.find(s => {
        const symptomDate = parseTimestamp(s.symptomDate);
        return symptomDate && isSameDay(symptomDate, date);
      });

      if (matchingSymptom) {
        setSymptom(matchingSymptom);
        const dynamicData = dynamicFields.reduce((acc, field) => {
          if (matchingSymptom[field.title] !== undefined) {
            acc[field.title] = matchingSymptom[field.title];
          }
          return acc;
        }, {});
        setDynamicValues(dynamicData);
      } else {
        setSymptom(null);
        setDynamicValues({});
      }
    } catch (err) {
      console.error('Error fetching symptoms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user.uid, dynamicFields]);

  useEffect(() => {
    getEntryForDate(selectedDate);
  }, [getEntryForDate, selectedDate]);

  const saveSymptom = useCallback(async (newValues) => {
    if (!user.uid) {
      console.error('User is not properly initialized');
      return;
    }

    try {
      const symptomData = {
        symptomDate: startOfDay(selectedDate),
        ...newValues
      };

      if (symptom) {
        await updateSymptom(user.uid, symptom.id, symptomData);
      } else {
        const newSymptomId = await addSymptom(user.uid, symptomData);
        setSymptom({ id: newSymptomId, ...symptomData });
      }

    } catch (e) {
      console.error("Error saving symptom:", e);
    }
  }, [user.uid, symptom, selectedDate]);

  const debouncedSaveSymptom = useMemo(
    () => debounce((newValues) => saveSymptom(newValues), 500),
    [saveSymptom]
  );

  const handleDynamicFieldChange = useCallback((fieldTitle, value) => {
    setDynamicValues(prev => {
      const newValues = { ...prev, [fieldTitle]: value };
      debouncedSaveSymptom(newValues);
      return newValues;
    });
  }, [debouncedSaveSymptom]);

  const handleDateChange = useCallback((newDate) => {
    const today = new Date();
    if (newDate <= endOfDay(today)) {
      setSelectedDate(newDate);
    } else {

    }
  }, []);

  const handlePreviousDay = useCallback(() => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prevDate => {
      const nextDay = addDays(prevDate, 1);
      return nextDay <= new Date() ? nextDay : prevDate;
    });
  }, []);

  const handleSliderChange = useCallback((fieldTitle, value) => {
    setLocalSliderValues(prev => ({ ...prev, [fieldTitle]: value }));
  }, []);

  const handleSliderChangeCommitted = useCallback((fieldTitle, value) => {
    handleDynamicFieldChange(fieldTitle, value);
    setLocalSliderValues(prev => ({ ...prev, [fieldTitle]: undefined }));
  }, [handleDynamicFieldChange]);

  const renderField = useCallback((field) => {
    switch (field.type) {
      case 'select':
        return (
          <FormControl fullWidth key={field.id}>
            <InputLabel id={`${field.id}-label`}>{field.label}</InputLabel>
            <Select
              id={field.id}
              value={dynamicValues[field.title] || ''}
              labelId={`${field.id}-label`}
              label={field.label}
              onChange={(e) => handleDynamicFieldChange(field.title, e.target.value)}
              fullWidth
            >
              <MenuItem value="" disabled>{`${field.label}`}</MenuItem>
              {field.values.map(value => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'text':
        return (
          <TextField
            key={field.id}
            id={field.id}
            value={dynamicValues[field.title] || ''}
            label={field.label}
            onChange={(e) => handleDynamicFieldChange(field.title, e.target.value)}
            fullWidth
            multiline={field.multiline}
            rows={field.multiline ? 4 : 1}
          />
        );
      case 'boolean':
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Switch
                checked={dynamicValues[field.title] || false}
                onChange={(e) => handleDynamicFieldChange(field.title, e.target.checked)}
                color="primary"
              />
            }
            label={field.label}
          />
        );
      case 'slider':
        const minValue = Number(field.minimum);
        const maxValue = Number(field.maximum);
        const currentValue = localSliderValues[field.title] !== undefined
          ? localSliderValues[field.title]
          : (dynamicValues[field.title] !== undefined 
            ? Number(dynamicValues[field.title]) 
            : minValue);

        if (isNaN(minValue) || isNaN(maxValue) || isNaN(currentValue)) {
          console.error(`Invalid slider values for ${field.title}:`, { min: field.min, max: field.max, current: dynamicValues[field.title] });
          return null;
        }

        return (
          <Box key={field.id} sx={{ width: '100%', mt: 2, mb: 2 }}>
            <Typography id={`${field.id}-label`} gutterBottom>
              {field.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: '30px', textAlign: 'right' }}>
                {minValue}
              </Typography>
              <Slider
                value={currentValue}
                onChange={(_, newValue) => handleSliderChange(field.title, newValue)}
                onChangeCommitted={(_, newValue) => handleSliderChangeCommitted(field.title, newValue)}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={minValue}
                max={maxValue}
                aria-labelledby={`${field.id}-label`}
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: '30px', textAlign: 'left' }}>
                {maxValue}
              </Typography>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  }, [dynamicValues, handleSliderChange, handleSliderChangeCommitted, localSliderValues, handleDynamicFieldChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Symptom Tracking</Typography>
        {dynamicFields.length === 0 && (
        <Typography variant="body1" color="error" sx={{ backgroundColor: '#ffebee', padding: 2, borderRadius: 4 }}>
          First, configure some 
          <Link to="/config" style={{ marginLeft: '4px', textDecoration: 'underline', color: 'blue' }}>
            questions
          </Link>
          .
      </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton onClick={handlePreviousDay} aria-label="previous day" disabled={isLoading}>
          <ColouredBackIcon />
        </IconButton>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={handleDateChange}
          maxDate={new Date()}
          renderInput={(params) => <TextField {...params} fullWidth sx={{ width: '60%' }} />}
        />
        <IconButton 
          onClick={handleNextDay} 
          aria-label="next day"
          disabled={isLoading || isSameDay(selectedDate, new Date())}
        >
          <ColouredForwardIcon />
        </IconButton>
      </Box>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && dynamicFields.map(renderField)}
    </Box>
  );
}

export default React.memo(SymptomTracker);
