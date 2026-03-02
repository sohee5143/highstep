import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import AttendanceTracker from './components/AttendanceTracker';
import AttendanceAdmin from './components/AttendanceAdmin';
import AttendanceList from './components/AttendanceList';

const COLORS = {
  primary: '#E3B04B',
  primaryHover: '#C8922E',
  background: '#000000', // Changed from '#111111' to black
  cardBg: '#1A1A1A',
  textMain: '#FFFFFF',
  textSub: '#B3B3B3',
  success: '#4CAF50', // Changed from '#22C55E' to a softer green
  danger: '#EF4444',
};


export default function AttendanceApp() {
  return (
    <HashRouter>
      <Switch>
        <Route path="/list">
          <AttendanceList />
        </Route>
        <Route path="/admin">
          <AttendanceAdmin />
        </Route>
        <Route path="/">
          <AttendanceTracker />
        </Route>
      </Switch>
    </HashRouter>
  );
}