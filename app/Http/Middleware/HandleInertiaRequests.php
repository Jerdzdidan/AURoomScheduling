<?php

namespace App\Http\Middleware;

use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    public function rootView(Request $request): string
    {
        if ($request->routeIs('auth.*')) {
            return 'auth';
        }
        return 'app';
    }

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'officerRooms' => fn () => $this->getOfficerRooms($request),
            'officerDepartmentName' => fn () => $this->getOfficerDepartmentName($request),
        ];
    }

    private function getOfficerRooms(Request $request): array
    {
        $user = $request->user();
        $department = $user?->department;

        if (!$user || $user->user_type !== 'OFFICER' || !$department?->id || !$department?->branch_id) {
            return [];
        }

        return Room::query()
            ->with(['departments:id'])
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->where('buildings.branch_id', $department->branch_id)
            ->orderBy('buildings.name')
            ->orderBy('rooms.code')
            ->get([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'buildings.id as building_id',
                'buildings.name as building_name',
                'buildings.code as building_code',
            ])
            ->map(fn (Room $room) => [
                'id' => $room->id,
                'code' => $room->code,
                'type' => $room->type,
                'building_id' => $room->building_id,
                'building_name' => $room->building_name,
                'building_code' => $room->building_code,
                'is_assigned_to_department' => $room->departments->contains('id', $department->id),
            ])
            ->values()
            ->all();
    }

    private function getOfficerDepartmentName(Request $request): ?string
    {
        $user = $request->user();

        if (!$user || $user->user_type !== 'OFFICER') {
            return null;
        }

        return $user->department?->name;
    }
}
