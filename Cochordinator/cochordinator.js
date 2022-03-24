autowatch = 1;
inlets = 8;
outlets = 2;

verbose = true;

// This is really the chord position w/in key, not pitch
INLET_PITCH = 0;
INLET_VELOCITY = 1;
INLET_KEY_ROOT = 2;
INLET_KEY_MINOR = 3;
INLET_TRANSPOSE = 4;
INLET_SIZE = 5;
INLET_TRIGGER_ENABLE = 6;
INLET_HOLD = 7
INLET_TEST = 8;

setinletassist(INLET_PITCH, "pitch");
setinletassist(INLET_VELOCITY, "velocity");
setinletassist(INLET_KEY_ROOT, "root");
setinletassist(INLET_TRANSPOSE, "transpose");
setinletassist(INLET_KEY_MINOR, "minor");
setinletassist(INLET_SIZE, "chord size");
setinletassist(INLET_TRIGGER_ENABLE, "trigger enable");

OUTLET_PITCH = 0
OUTLET_VELOCITY = 1


// inputs

var note_off = false;
var velocity = 100;
var pitch = 0;
var transpose_enabled = true;
var key_root = 36;
var key_minor = false;
var chord_size = 1;
var triggers_enabled = false;
var hold_notes = false;






/*
	incoming events: key down, key up
	outtoign events: note on, note off
	
	every method returns array of notes
*/	
function array_remove(arr,item)
{
	if (arr)
	{
		var pos = arr.indexOf(item);
		if (pos >= 0)
			arr.splice(pos, 1);
	}
	return arr;
}
function EventTracker()
{
	this.ins = new Array(128);
	for (var i=0 ; i<128 ; i++)
		this.ins[i] = [];
	this.outs = new Array(128);
}
EventTracker.prototype = {
	
	key_down : function(key_in, notes_out)
	{
		for (var i=0 ; i<notes_out.length ; i++)
		{
			var note_out = notes_out[i];
			var k = this.outs[note_out];
			if (k !== undefined)
				array_remove(this.ins[k], note_out);
			this.outs[note_out] = key_in;
		}
		this.ins[key_in] = this.ins[key_in].concat(notes_out);
		if (verbose)
			post("key_down " + key_in + "(" + notes_out.join(",") + ")\n");
		return notes_out;
	},
	
	key_up : function(key_in)
	{
		var notes = this.ins[key_in];
		for (var i=0 ; i<notes.length ; i++)
			this.outs[notes[i]] = undefined;
		this.ins[key_in] = []
		if (verbose)
			post("key_up " + key_in + " -> " + notes.join(",") + "\n");
		return notes;
	},
	
	all_notes_off : function()
	{
		post("ALL_NOTES_OFF", this.ins.length, "\n");
		var ret = []
		for (var i=0 ; i<128 ; i++)
		{
			if (this.ins[i])
			{
				this.ins[i] = [];
			}
			if (this.outs[i] !== undefined)
			{
				ret.push(this.outs[i]);
				this.outs[i] = undefined;
			}
		}
		return ret;
	}
};












// computed 

var pitch_quantizer = undefined;
var chord_map = undefined;
var transpose = 0;
var current_note_set = [];

var sequence = undefined;
var position = -1;

var tracker = new EventTracker();



function init_chord()
{
		if (!chord_map)
		{
			var ret = _compute_chord_map(key_root, key_minor);
			pitch_quantize = ret[0];
			chord_map = ret[1];
			transpose = key_root % 12;
		}
}



function msg_int(msg)
{
	if (INLET_PITCH === inlet)
	{
		if (note_off)
		{
			if (!hold_notes)
				_note_off(msg);
			note_off = false;
		}
		else
		{
			pitch = msg;
			init_chord();
			_note_on(msg, velocity);
		}
	}
	else if (INLET_VELOCITY === inlet)
	{
		if (msg > 0)
		{
			note_off = false;
			velocity = msg;
		}
		else
		{
			note_off = true;
		}
	}
	else if (INLET_SIZE == inlet)
	{
		if (msg >= 1 && msg <= 12)
			chord_size = msg;
		sequence = undefined;
		position = -1;
	}
	else if (INLET_KEY_ROOT === inlet)
	{
		if (key_root !== msg)
		{
			key_root = msg;
			transpose = key_root % 12;
			_key_change();
		}
	}
	else if (INLET_KEY_MINOR === inlet)
	{
		if (key_minor !== (msg!==0))
		{
			key_minor = (msg!==0);
			_key_change();
		}
	}
	else if (INLET_TRANSPOSE === inlet)
	{
		if (transpose_enabled !== !!msg)
		{
			transpose_enabled = !!msg;
		}
	}
	else if (INLET_TRIGGER_ENABLE == inlet)
	{
		if (triggers_enabled !== (msg!==0))
		{
			triggers_enabled = (msg!==0);
			_key_change();
		}
	}
	else if (INLET_HOLD == inlet)
	{
		if (hold_notes != !!msg)
		{
			if (hold_notes)
				_all_notes_off();
			hold_notes = !!msg;
		}
	}
	else if (INLET_TEST == inlet)
	{
		_test();
	}
}



function bang()
{
	if (INLET_PITCH == inlet)
	{
		if (triggers_enabled)
		{
			init_chord();
			_trigger_next();
		}
	}	
	else if (INLET_VELOCITY == inlet)
	{
		if (triggers_enabled)
		{
			init_chord();
			_trigger_prev();
		}
	}	
	else if (INLET_TEST === inlet)
	{
		_test();
	}
}

 


function _quantize(pitch, q)
{
	return pitch + q[pitch % 12]
}


function _test()
{
	var ret = _compute_chord_map(key_root, key_minor);
	var pitch_quantize = ret[0];
	var chord_map = ret[1];
	var s = "";
	for (var i=0 ; i<12 ; i++)
	{
		s += cm[i].join(" ") + "\n";
	}
	
	post(s);
}


function _key_change()
{
	// make sure we don't orphan any notes
	velocity = 0;
	_all_notes_off();
	chord_map = undefined;
}



function _before_notes_out()
{
	if (!hold_notes)
		return;
	// have to turn off previous notes, since we're ignoring note_off
	_all_notes_off();
}	


function _note_off(pitch)
{
	if (hold_notes)
		return;
	var turn_off = tracker.key_up(pitch);
	for (var i=0 ; i<turn_off.length ; i++)
	{
		outlet(OUTLET_VELOCITY, 0);
		outlet(OUTLET_PITCH, turn_off[i]);
	}
}


function _note_on(pitch, velocity)
{
	var p = pitch;
	if (transpose_enabled)
		p = p + transpose;
	p = p + pitch_quantize[p%12];
	if (verbose)
		post("chord_size=" + chord_size + " pitch=" + pitch + " p=" + p + " " + chord_map[p%12].join(",") + "\n");
	var pitch_map = chord_map[p % 12].slice(0,chord_size);
	pitch_map.sort(function (a,b) { return a-b;})
	current_note_set = [];
	for (var i = 0 ; i < pitch_map.length ; i++)
		current_note_set.push(p + pitch_map[i]);
	if (verbose)
		post(current_note_set.join("!") + "\n");
	
			
	if (!triggers_enabled)
	{
		for (var i=0 ; i<current_note_set.length ; i++)
		{
			outlet(OUTLET_VELOCITY, 0);
			outlet(OUTLET_PITCH, current_note_set[i]);
		}
		_before_notes_out();
		for (var i=0 ; i<current_note_set.length ; i++)
		{
			outlet(OUTLET_VELOCITY, velocity);
			outlet(OUTLET_PITCH, current_note_set[i]);
		}
		tracker.key_down(pitch,current_note_set);
	}
}



function _reset()
{
	position = -1;
}


var prev_pitch = -1;



function _trigger_next()
{
	_trigger_move(2);
}



function _trigger_prev()
{
	_trigger_move(-1);	
}



var TRIGGER_PITCH=127;

function _trigger_move(rel)
{
	if (pitch != prev_pitch)
		_reset();
	prev_pitch = pitch;	

	if (verbose)
		post("CURRENT " + current_note_set.join(" ") + "\n");

	var turn_off = tracker.key_up(TRIGGER_PITCH);
	for (var i=0 ; i<turn_off.length ; i++)
	{
		outlet(OUTLET_VELOCITY, 0);
		outlet(OUTLET_PITCH, turn_off[i]);
	}

	if (!current_note_set)
		return;
    var note = current_note_set[(position + current_note_set.length) % current_note_set.length];
	if (verbose)
		post(" NOTE ON  " + note + "\n");
	_before_notes_out();
	outlet(OUTLET_VELOCITY, velocity);
	outlet(OUTLET_PITCH, note);
	tracker.key_down(TRIGGER_PITCH, [note]);

	position = (position + current_note_set.length + rel) % current_note_set.length;
}


function _all_notes_off()
{
	var notes = tracker.all_notes_off();
	notes = notes.concat(current_note_set);
	for (var i = 0 ; i < notes.length ; i++)
	{
		outlet(OUTLET_VELOCITY, 0);
		outlet(OUTLET_PITCH, notes[i]);
	}
}



function _trigger_all()
{
	_all_notes_off();
	for (var i = 0 ; i < current_note_set.length ; i++)
	{
		outlet(OUTLET_VELOCITY, velocity);
		outlet(OUTLET_PITCH, current_note_set[i]);
	}
}



function _compute_chord_map(root, minor)
{
	var major = !minor;
	var pitch_quantizer = major ? [0, +1,  0, +1,  0,  0, +1,  0, +1,  0, +1,  0]
								: [0, -1,  0,  0, -1,  0, -1,  0,  0, -1,  0, -1];

	var chord_quantizer = major ? [0, -1,  0, -1,  0,  0, -1,  0, -1,  0, -1,  0]
								: [0, -1,  0,  0, -1,  0, -1,  0,  0, -1,  0, -1];

	// quantizer will handle converting major->minor 
	var chord_notes = [0, 7, 4, -8, -5, 12, 16, 19, 24, 28, 31, 36]


	// rotate arrays based on root
	var rot = 12 - (root % 12);
	pitch_quantizer = pitch_quantizer.slice(rot).concat(pitch_quantizer.slice(0,rot));
	chord_quantizer = chord_quantizer.slice(rot).concat(chord_quantizer.slice(0,rot));


	var chord_map = [];
	for (var p = 0 ; p < 12 ; p++)
	{
		var pitch_map = [];
		for (var i=0 ; i<12 ; i++)
		{
			var n = p + chord_notes[i];
			var n = n + chord_quantizer[(n+120) % 12]
			if (verbose)
				post("p=" + p + " n=" + n + " root=" + (root%12) + "\n");
			// here is where we transpose into key
			pitch_map.push(n-p);
		}
		chord_map.push(pitch_map);
	}
	return [pitch_quantizer, chord_map];
}







/* TEST * /
post( array_remove([1,2,3],2).join("&")+"\n" );

var T = new EventTracker();
T.key_down(36,[36,37,38]);
T.key_down(38,[38,39,40]);
var r = T.key_up(36);
post(r.join("+") + "\n");
r = T.key_up(38);
post(r.join("+") + "\n");
*/

