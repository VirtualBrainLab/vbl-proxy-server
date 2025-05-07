#!/usr/bin/env python3
import socketio
import time
import threading
import uuid
import json
from queue import Queue


class TestResults:
    def __init__(self):
        self.sender_received = Queue()
        self.receiver_received = Queue()
        self.test_complete = threading.Event()
        self.all_tests_passed = True
        self.failures = []


# SERVER = "http://localhost:5000"
SERVER = "https://pinpoint.allenneuraldynamics-test.org:5000"


def run_test():
    results = TestResults()
    
    # Generate a unique ID for this test session
    test_id = str(uuid.uuid4())
    print(f"Using test ID: {test_id}")

    # Create sender socket
    sender_sio = socketio.Client()
    
    # Create receiver socket
    receiver_sio = socketio.Client()
    
    # Setup sender socket event handlers
    @sender_sio.event
    def connect():
        print("Sender connected")
        # Send ID to identify as a sender
        sender_sio.emit('ID', [test_id, "send"])
    
    @sender_sio.event
    def disconnect():
        print("Sender disconnected")
    
    # Setup events that the receiver should send to the sender
    @sender_sio.on('NeuronCallback')
    def on_neuron_callback(data):
        print(f"Sender received NeuronCallback: {data}")
        results.sender_received.put(('NeuronCallback', data))
    
    @sender_sio.on('log')
    def on_log(data):
        print(f"Sender received log: {data}")
        results.sender_received.put(('log', data))
        
    # Setup receiver socket event handlers
    @receiver_sio.event
    def connect():
        print("Receiver connected")
        # Send ID to identify as a receiver
        receiver_sio.emit('ID', [test_id, "receive"])
    
    @receiver_sio.event
    def disconnect():
        print("Receiver disconnected")
    
    # Setup events that the sender should send to the receiver
    @receiver_sio.on('test_message')
    def on_test_message(data):
        print(f"Receiver received test_message: {data}")
        results.receiver_received.put(('test_message', data))
    
    @receiver_sio.on('test_json')
    def on_test_json(data):
        print(f"Receiver received test_json: {data}")
        results.receiver_received.put(('test_json', data))
    
    try:
        # Connect both clients to the server
        print("Connecting sender...")
        sender_sio.connect(SERVER)
        
        print("Connecting receiver...")
        receiver_sio.connect(SERVER)
        
        # Wait for connections to establish and IDs to be processed
        time.sleep(2)
        
        # Test 1: Sender to Receiver communication
        print("\n--- Test 1: Sender -> Receiver ---")
        test_msg = "Hello from sender"
        print(f"Sending message: {test_msg}")
        sender_sio.emit('test_message', test_msg)
        
        # Wait for message to be received
        try:
            event, data = results.receiver_received.get(timeout=5)
            if event == 'test_message' and data == test_msg:
                print("✅ Test 1 passed: Receiver got the correct message")
            else:
                print(f"❌ Test 1 failed: Received wrong message: {event}, {data}")
                results.all_tests_passed = False
                results.failures.append("Test 1")
        except Exception as e:
            print(f"❌ Test 1 failed: {e}")
            results.all_tests_passed = False
            results.failures.append("Test 1")
        
        # Test 2: Send JSON data
        print("\n--- Test 2: Sender -> Receiver (JSON) ---")
        test_json = {"key": "value", "nested": {"data": [1, 2, 3]}}
        print(f"Sending JSON: {test_json}")
        sender_sio.emit('test_json', test_json)
        
        try:
            event, data = results.receiver_received.get(timeout=5)
            if event == 'test_json' and data == test_json:
                print("✅ Test 2 passed: Receiver got the correct JSON")
            else:
                print(f"❌ Test 2 failed: Received wrong data: {event}, {data}")
                results.all_tests_passed = False
                results.failures.append("Test 2")
        except Exception as e:
            print(f"❌ Test 2 failed: {e}")
            results.all_tests_passed = False
            results.failures.append("Test 2")
        
        # Test 3: Receiver to Sender communication
        print("\n--- Test 3: Receiver -> Sender ---")
        print("Sending log message from receiver")
        receiver_sio.emit('log', "Log message from receiver")
        
        try:
            event, data = results.sender_received.get(timeout=5)
            if event == 'log' and data == "Log message from receiver":
                print("✅ Test 3 passed: Sender received the log message")
            else:
                print(f"❌ Test 3 failed: Received wrong message: {event}, {data}")
                results.all_tests_passed = False
                results.failures.append("Test 3")
        except Exception as e:
            print(f"❌ Test 3 failed: {e}")
            results.all_tests_passed = False
            results.failures.append("Test 3")
        
        # Test 4: Test NeuronCallback
        print("\n--- Test 4: Receiver -> Sender (NeuronCallback) ---")
        neuron_data = {"neuron_id": 123, "status": "active"}
        print(f"Sending neuron callback: {neuron_data}")
        receiver_sio.emit('NeuronCallback', neuron_data)
        
        try:
            event, data = results.sender_received.get(timeout=5)
            if event == 'NeuronCallback' and data == neuron_data:
                print("✅ Test 4 passed: Sender received the neuron callback")
            else:
                print(f"❌ Test 4 failed: Received wrong message: {event}, {data}")
                results.all_tests_passed = False
                results.failures.append("Test 4")
        except Exception as e:
            print(f"❌ Test 4 failed: {e}")
            results.all_tests_passed = False
            results.failures.append("Test 4")
        
    except Exception as e:
        print(f"Error during test: {e}")
        results.all_tests_passed = False
        results.failures.append(f"Connection error: {e}")
    
    finally:
        # Disconnect both clients
        print("\nDisconnecting clients...")
        try:
            sender_sio.disconnect()
        except:
            pass
        
        try:
            receiver_sio.disconnect()
        except:
            pass
        
        # Print final test results
        print("\n=== TEST RESULTS ===")
        if results.all_tests_passed:
            print("✅ All tests passed!")
        else:
            print(f"❌ Some tests failed: {results.failures}")
        
        results.test_complete.set()
    
    return results


if __name__ == "__main__":
    print("Starting Socket.io proxy server test")
    print(f"Make sure the server is running on {SERVER}")
    print("Press Ctrl+C to abort the test\n")
    
    try:
        results = run_test()
        
        if results.all_tests_passed:
            exit(0)  # Success
        else:
            exit(1)  # Failure
    
    except KeyboardInterrupt:
        print("\nTest aborted by user")
        exit(2)
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        exit(1)