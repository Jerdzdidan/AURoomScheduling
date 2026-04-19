<?php

namespace App\Http\Controllers\Admin\Core;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class RoomController extends Controller
{
    public function index()
    {
        return inertia('Admin/Core/Room', [
            'buildings' => Building::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function getData()
    {
        $rooms = Room::query()
            ->leftJoin('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->select([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'rooms.building_id',
                'buildings.name as building_name',
                'buildings.code as building_code',
            ]);

        return DataTables::of($rooms)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Room::count(),
            'buildings_covered' => Room::query()->distinct('building_id')->count('building_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $room = $this->findRoomOrFail($id);

            return response()->json([
                'id' => $id,
                'code' => $room->code,
                'type' => $room->type,
                'building_id' => $room->building_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Room::create($this->validateRoom($request));

        return redirect()->back()->with('success', 'Room created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $room = $this->findRoomOrFail($id);
            $room->update($this->validateRoom($request, $room));

            return redirect()->back()->with('success', 'Room updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $room = $this->findRoomOrFail($id);

            // We can add checks here if the room has scheduled classes/sections later.
            // if ($room->schedules()->exists()) {
            //     return response()->json([
            //         'success' => false,
            //         'message' => 'This room cannot be deleted while it still has schedules.',
            //     ], 422);
            // }

            $room->delete();

            return response()->json([
                'success' => true,
                'message' => 'Room deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid room ID.',
            ], 400);
        }
    }

    private function validateRoom(Request $request, ?Room $room = null): array
    {
        $request->merge([
            'code' => strtoupper(trim((string) $request->input('code'))),
        ]);

        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('rooms', 'code')
                    ->where(fn ($query) => $query->where('building_id', $request->input('building_id')))
                    ->ignore($room?->id),
            ],
            'type' => ['required', 'string', 'max:255'],
            'building_id' => ['required', 'integer', 'exists:buildings,id'],
        ]);
    }

    private function findRoomOrFail(string $id): Room
    {
        $decrypted = Crypt::decryptString($id);

        return Room::findOrFail($decrypted);
    }
}
